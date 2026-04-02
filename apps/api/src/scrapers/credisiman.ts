import { chromium } from "playwright";
import {
  detectCategory,
  detectDiscountType,
  extractDiscountValue,
  parseSpanishDate,
  type RawPromo,
} from "./types";
import { savePromos, logScraperRun } from "../lib/db";

const BANK_ID = "credisiman" as const;
const BASE_URL = "https://www.credisiman.com";
const LIST_URL = `${BASE_URL}/promotion/SV`;

export async function credisimanScraper(): Promise<void> {
  const startedAt = new Date().toISOString();
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({
      "Accept-Language": "es-SV,es;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    // Interceptar API de Credisiman (ingress-prd.credisiman.com)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apiPromos: any[] = [];
    page.on("response", async (response) => {
      const url = response.url();
      if (
        (url.includes("ingress-prd.credisiman.com/cards/promotions") ||
         url.includes("/api/promotion") ||
         url.includes("/promotion/api")) &&
        response.status() === 200
      ) {
        try {
          const contentType = response.headers()["content-type"] ?? "";
          if (contentType.includes("application/json")) {
            const json = await response.json();
            if (Array.isArray(json)) apiPromos.push(...json);
            else if (Array.isArray(json?.data)) apiPromos.push(...json.data);
            else if (Array.isArray(json?.content)) apiPromos.push(...json.content);
            else if (Array.isArray(json?.promotions)) apiPromos.push(...json.promotions);
            else if (Array.isArray(json?.response)) apiPromos.push(...json.response);
          }
        } catch { /* ignorar */ }
      }
    });

    await page.goto(LIST_URL, { waitUntil: "networkidle", timeout: 30_000 });
    await page.waitForSelector(".card-item", { timeout: 15_000 });

    // Si la API interceptada tiene datos, usarlos directamente
    if (apiPromos.length > 0) {
      console.log(`[${BANK_ID}] API capturada: ${apiPromos.length} items`);
      const rawPromos: RawPromo[] = apiPromos
        .filter((item) => {
          const t = item.title ?? item.name ?? item.nombre ?? item.titulo ?? "";
          return typeof t === "string" && t.trim().length > 0;
        })
        .map((item): RawPromo => {
          const title = (item.title ?? item.name ?? item.nombre ?? item.titulo ?? "").trim();
          const description = item.description ?? item.descripcion ?? item.terms ?? item.conditions ?? null;
          const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").substring(0, 60);
          const combined = [title, description ?? "", item.category ?? "", item.store ?? ""].join(" ");
          return {
            bankId: BANK_ID,
            title,
            description: typeof description === "string" ? description : null,
            categoryId: detectCategory(combined),
            discountType: detectDiscountType(combined),
            discountValue: extractDiscountValue(combined),
            expiresAt: parseSpanishDate(combined) ?? null,
            imageUrl: item.imageUrl ?? item.image ?? item.banner ?? item.thumbnail ?? item.photo ?? item.img ?? item.picture ?? null,
            sourceUrl: item.id
              ? `${LIST_URL}#${item.id}`
              : `${LIST_URL}#${slug}`,
          };
        });

      await savePromos(rawPromos);
      await logScraperRun({ bankId: BANK_ID, status: "success", promosFound: rawPromos.length, errorType: null, errorMessage: null, startedAt });
      console.log(`[${BANK_ID}] ${rawPromos.length} promos guardadas`);
      return;
    }

    // Fallback: scraping del DOM con extracción ampliada de texto
    const baseItems = await page.$$eval(".card-item", (cards) =>
      cards.map((card) => {
        const imgEl = card.querySelector("img.image-promotion") as HTMLImageElement | null;
        const title = card.querySelector("h5.title-promotion")?.textContent?.trim() ?? "";
        const verLink = card.querySelector("a") as HTMLAnchorElement | null;
        const href = verLink?.href ?? "";
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").substring(0, 60);

        // Intentar extraer descripción de elementos dentro del card
        // Credisiman a veces tiene un panel expandido con class "card-body" o "description"
        const bodyText = (
          card.querySelector(".card-body, .description, .promotion-body, .card-text, p")
          ?? null
        )?.textContent?.trim() ?? null;

        // rawText completo — incluye texto de secciones colapsadas en el DOM
        const rawText = card.textContent?.trim() ?? "";
        // Quitar el título del rawText para aislar la descripción
        const descCandidate = rawText.replace(title, "").trim();

        return {
          title,
          // Priorizar: bodyText explícito → descripción limpia del rawText
          descriptionRaw: bodyText ?? (descCandidate.length > 5 ? descCandidate : null),
          imageUrl: imgEl?.src && !imgEl.src.startsWith("data:") && !imgEl.src.startsWith("blob:") ? imgEl.src : null,
          href: href.startsWith("http") ? href : null,
          slug,
          rawText,
        };
      })
    );

    // Para cada tarjeta que tiene un link individual, navegar a él y obtener descripción
    const detailPage = await browser.newPage();
    await detailPage.setExtraHTTPHeaders({
      "Accept-Language": "es-SV,es;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    const enriched: { description: string | null; rawText: string }[] = [];

    for (const item of baseItems) {
      if (item.href && item.href !== LIST_URL) {
        try {
          await detailPage.goto(item.href, { waitUntil: "domcontentloaded", timeout: 10_000 });
          const detail = await detailPage.evaluate(() => {
            // Buscar el bloque de descripción/condiciones en la página de detalle
            const selectors = [
              ".promotion-detail",
              ".promotion-description",
              ".terms-conditions",
              ".card-detail",
              "main p",
              ".container p",
              "[class*='description']",
              "[class*='detail']",
              "[class*='condition']",
            ];
            for (const sel of selectors) {
              const el = document.querySelector(sel);
              if (el && el.textContent && el.textContent.trim().length > 10) {
                return el.textContent.trim();
              }
            }
            return null;
          });
          enriched.push({ description: detail, rawText: await detailPage.evaluate(() => document.body.textContent ?? "") });
        } catch {
          enriched.push({ description: item.descriptionRaw, rawText: item.rawText });
        }
      } else {
        enriched.push({ description: item.descriptionRaw, rawText: item.rawText });
      }
    }

    await detailPage.close();

    const rawPromos: RawPromo[] = baseItems
      .filter((item) => item.title.length > 0)
      .map((item, i) => {
        const detail = enriched[i] ?? { description: null, rawText: "" };
        const description = detail.description;
        const combined = `${item.title} ${description ?? ""}`;
        return {
          bankId: BANK_ID,
          title: item.title,
          description,
          categoryId: detectCategory(combined),
          discountType: detectDiscountType(combined),
          discountValue: extractDiscountValue(combined),
          expiresAt: parseSpanishDate(detail.rawText) ?? parseSpanishDate(item.rawText),
          imageUrl: item.imageUrl,
          sourceUrl: item.href ?? `${LIST_URL}#${item.slug}`,
        } satisfies RawPromo;
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
      errorType: message.includes("timeout") ? "timeout" : "ip-blocked",
      errorMessage: message,
      startedAt,
    });
  } finally {
    await browser.close();
  }
}
