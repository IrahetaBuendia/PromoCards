import { chromium } from "playwright";
import {
  detectCategory,
  detectDiscountType,
  extractDiscountValue,
  parseSpanishDate,
  type RawPromo,
} from "./types";
import { savePromos, logScraperRun } from "../lib/db";

const BANK_ID = "credicomer" as const;
const BASE_URL = "https://www.credicomer.com.sv";
// Sin filtro de tipo para capturar TODAS las promos (emma, visa, mastercard, etc.)
const URL = `${BASE_URL}/personas/promociones`;

export async function credicomerScraper(): Promise<void> {
  const startedAt = new Date().toISOString();
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();

    // Interceptar la respuesta del API interno de Credicomer para obtener datos completos
    // (los nombres de Netflix, Spotify, etc. solo aparecen en imágenes, no en el DOM de texto)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apiPromos: any[] = [];

    page.on("response", async (response) => {
      const url = response.url();
      if (
        url.includes("/api/promotions") &&
        !url.includes("/image") &&
        response.status() === 200
      ) {
        try {
          const contentType = response.headers()["content-type"] ?? "";
          if (contentType.includes("application/json")) {
            const json = await response.json();
            if (Array.isArray(json)) {
              apiPromos.push(...json);
            } else if (Array.isArray(json?.data)) {
              apiPromos.push(...json.data);
            } else if (Array.isArray(json?.promotions)) {
              apiPromos.push(...json.promotions);
            }
          }
        } catch {
          // ignorar errores de parsing
        }
      }
    });

    await page.goto(URL, { waitUntil: "networkidle", timeout: 60_000 });

    // Esperar que carguen las imágenes de promos como señal de que el SPA terminó
    await page.waitForSelector("img[src*='/api/promotions/']", { timeout: 20_000 });

    // Hacer scroll para disparar lazy loading de todas las promos
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1_500);
    await page.evaluate(() => window.scrollTo(0, 0));

    // Dar tiempo extra para que todas las llamadas al API interno terminen
    await page.waitForTimeout(4_000);

    // Si el API interno nos dio datos, usarlos directamente
    if (apiPromos.length > 0) {
      console.log(`[${BANK_ID}] API interna capturada: ${apiPromos.length} promos`);

      const rawPromos: RawPromo[] = apiPromos
        .filter((item) => {
          const title =
            item.title ?? item.name ?? item.nombre ?? item.titulo ??
            item.promotion_name ?? item.heading ?? item.store ?? item.comercio ?? "";
          return typeof title === "string" && title.trim().length > 0;
        })
        .map((item): RawPromo => {
          // Adaptar a múltiples posibles estructuras del JSON de Credicomer
          const title =
            (item.title ?? item.name ?? item.nombre ?? item.titulo ??
             item.promotion_name ?? item.heading ??
             item.store ?? item.comercio ?? "").trim();
          const description =
            (item.description ?? item.descripcion ?? item.terms ?? item.conditions ?? null);
          const promoId = item.id ?? item.promotionId ?? "";
          const imageUrl = promoId
            ? `${BASE_URL}/api/promotions/${promoId}/image`
            : null;

          // Texto para categorización: combinar todos los campos de texto disponibles
          const combined = [
            title,
            description ?? "",
            item.category ?? item.categoria ?? "",
            item.tags ?? "",
            item.store ?? item.comercio ?? "",
          ].join(" ");

          const expiresAt =
            item.expiresAt ??
            item.expires_at ??
            item.validUntil ??
            item.valid_until ??
            item.endDate ??
            item.end_date ??
            parseSpanishDate(combined) ??
            null;

          return {
            bankId: BANK_ID,
            title,
            description: typeof description === "string" ? description : null,
            categoryId: detectCategory(combined),
            discountType: detectDiscountType(combined),
            discountValue: extractDiscountValue(combined),
            expiresAt: typeof expiresAt === "string" ? expiresAt : null,
            imageUrl,
            sourceUrl: promoId
              ? `${BASE_URL}/personas/promociones/${promoId}`
              : URL,
          };
        });

      await savePromos(rawPromos);
      await logScraperRun({
        bankId: BANK_ID,
        status: "success",
        promosFound: rawPromos.length,
        errorType: null,
        errorMessage: null,
        startedAt,
      });
      console.log(`[${BANK_ID}] ${rawPromos.length} promos guardadas`);
      return;
    }

    // Fallback: scraping del DOM
    console.log(`[${BANK_ID}] API no capturada, usando scraping DOM como fallback`);

    const rawPromos: RawPromo[] = await page
      .$$eval("img[src*='/api/promotions/']", (imgs) =>
        imgs.map((img) => {
          const imgEl = img as HTMLImageElement;
          const imgSrc = imgEl.src ?? "";
          const promoId = imgSrc.match(/\/api\/promotions\/(\d+)\//)?.[1] ?? "";
          // La card es el ancestor con clase "card"
          const card = imgEl.closest("[class*='card']") ?? imgEl.parentElement?.parentElement?.parentElement;
          const rawText = card?.textContent?.trim() ?? "";
          // El título está en el div con clase text-lg, la descripción en text-sm
          const titleEl = card?.querySelector("[class*='text-lg']");
          const descEl = card?.querySelector("[class*='text-sm']");
          const title = titleEl?.textContent?.trim() ?? rawText.slice(0, 80);
          const description = descEl?.textContent?.trim() ?? null;
          return {
            title,
            description,
            imageUrl: imgSrc ? `https://www.credicomer.com.sv${imgSrc}` : null,
            sourceUrl: promoId
              ? `https://www.credicomer.com.sv/personas/promociones/${promoId}`
              : "https://www.credicomer.com.sv/personas/promociones",
            rawText,
          };
        })
      )
      .then((items) => {
        const filtered = items.filter((item) => item.title.length > 0);
        console.log(`[${BANK_ID}] Fallback encontró ${filtered.length} promos:`, JSON.stringify(filtered.map((i) => i.title)));
        return filtered.map((item) => {
          const combined = `${item.title} ${item.description ?? ""}`;
          return {
            bankId: BANK_ID,
            title: item.title,
            description: item.description,
            categoryId: detectCategory(combined),
            discountType: detectDiscountType(combined),
            discountValue: extractDiscountValue(combined),
            expiresAt: parseSpanishDate(item.rawText),
            imageUrl: item.imageUrl,
            sourceUrl: item.sourceUrl,
          } satisfies RawPromo;
        });
      });

    await savePromos(rawPromos);
    await logScraperRun({
      bankId: BANK_ID,
      status: "success",
      promosFound: rawPromos.length,
      errorType: null,
      errorMessage: null,
      startedAt,
    });
    console.log(`[${BANK_ID}] ${rawPromos.length} promos guardadas`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${BANK_ID}] Error:`, message);
    await logScraperRun({
      bankId: BANK_ID,
      status: "error",
      promosFound: 0,
      errorType: message.includes("timeout") ? "timeout" : "selector-broken",
      errorMessage: message,
      startedAt,
    });
  } finally {
    await browser.close();
  }
}
