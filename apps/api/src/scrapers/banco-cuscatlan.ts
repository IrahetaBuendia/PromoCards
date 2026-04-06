import { chromium } from "playwright";
import {
  detectCategory,
  detectDiscountType,
  extractDiscountValue,
  parseSpanishDate,
  type RawPromo,
} from "./types";
import { savePromos, logScraperRun } from "../lib/db";

const BANK_ID = "banco-cuscatlan" as const;
const LIST_URL = "https://www.bancocuscatlan.com/tarjetas/promociones";

// Detecta si un array JSON parece contener registros de promociones
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function looksLikePromoArray(arr: any[]): boolean {
  if (!arr.length) return false;
  const first = arr[0];
  if (typeof first !== "object" || first === null) return false;
  const keys = Object.keys(first).join(" ").toLowerCase();
  return (
    keys.includes("title") ||
    keys.includes("name") ||
    keys.includes("nombre") ||
    keys.includes("promo") ||
    keys.includes("descripci")
  );
}

// Extrae el array de promos de cualquier estructura de respuesta JSON conocida
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPromoArray(json: any): any[] {
  if (Array.isArray(json) && looksLikePromoArray(json)) return json;
  for (const key of ["data", "response", "promotions", "promos", "items", "result", "results", "content", "records"]) {
    if (Array.isArray(json?.[key]) && looksLikePromoArray(json[key])) return json[key];
  }
  return [];
}

export async function bancoCuscatlanScraper(): Promise<void> {
  const startedAt = new Date().toISOString();
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ "Accept-Language": "es-SV,es;q=0.9" });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const capturedPromos: any[] = [];

    // Interceptar TODAS las respuestas JSON buscando datos de promociones.
    // La API del Angular SPA puede estar en cualquier dominio (CDN, BFF, etc.)
    page.on("response", async (response) => {
      if (response.status() !== 200) return;
      const contentType = response.headers()["content-type"] ?? "";
      if (!contentType.includes("application/json")) return;
      try {
        const json = await response.json();
        const arr = extractPromoArray(json);
        if (arr.length > 0) {
          capturedPromos.push(...arr);
          console.log(`[${BANK_ID}] API capturada (${response.url()}): ${arr.length} items`);
        }
      } catch {
        // ignorar errores de parsing
      }
    });

    await page.goto(LIST_URL, { waitUntil: "networkidle", timeout: 60_000 });

    // Angular necesita tiempo extra para renderizar los componentes
    await page.waitForTimeout(3_000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2_000);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1_500);

    // ── Estrategia 1: datos capturados del API ──────────────────────────────
    if (capturedPromos.length > 0) {
      console.log(`[${BANK_ID}] Usando API interceptada: ${capturedPromos.length} items`);

      const rawPromos: RawPromo[] = capturedPromos
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((item: any) => {
          const t = item.title ?? item.name ?? item.nombre ?? item.titulo ?? "";
          return typeof t === "string" && t.trim().length > 0;
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any): RawPromo => {
          const title = (
            item.title ?? item.name ?? item.nombre ?? item.titulo ?? ""
          ).trim();
          const description =
            item.description ?? item.descripcion ?? item.terms ?? item.body ?? null;
          const imageUrl =
            item.imageUrl ?? item.image ?? item.img ??
            item.image_url ?? item.banner ?? item.thumbnail ?? null;
          const sourceUrl =
            item.url ?? item.link ?? item.href ??
            (item.id ? `${LIST_URL}/${item.id}` : LIST_URL);
          const expiresAt =
            item.expiresAt ?? item.expires_at ?? item.validUntil ??
            item.valid_until ?? item.endDate ?? item.end_date ??
            parseSpanishDate(String(description ?? "")) ?? null;
          const combined = `${title} ${description ?? ""}`;

          return {
            bankId: BANK_ID,
            title,
            description: typeof description === "string" ? description : null,
            categoryId: detectCategory(combined),
            discountType: detectDiscountType(combined),
            discountValue: extractDiscountValue(combined),
            expiresAt: typeof expiresAt === "string" ? expiresAt : null,
            imageUrl: typeof imageUrl === "string" ? imageUrl : null,
            sourceUrl: typeof sourceUrl === "string" ? sourceUrl : LIST_URL,
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

    // ── Estrategia 2: DOM scraping post-Angular render ──────────────────────
    console.log(`[${BANK_ID}] API no capturada, intentando DOM scraping`);

    // Selectores típicos de Angular Material y SPAs bancarias
    const domSelectors = [
      "mat-card",
      "app-promo-card",
      "app-promotion-card",
      "app-card",
      "[class*='promo-card']",
      "[class*='promotion-card']",
      "[class*='promo_card']",
      "[class*='PromoCard']",
      ".card-promotion",
      ".promotion-item",
      ".promo-item",
      "article.card",
    ];

    let workingSelector: string | null = null;
    for (const sel of domSelectors) {
      const count = await page.$$eval(sel, (els) => els.length).catch(() => 0);
      if (count > 0) {
        workingSelector = sel;
        console.log(`[${BANK_ID}] DOM selector: "${sel}" (${count} elementos)`);
        break;
      }
    }

    if (!workingSelector) {
      throw new Error(
        `No se encontró selector DOM ni API en ${LIST_URL}. ` +
          `DOM probados: ${domSelectors.join(", ")}`
      );
    }

    const rawPromos: RawPromo[] = await page
      .$$eval(workingSelector, (cards, url) =>
        cards.map((card) => {
          const titleEl = card.querySelector(
            "h1, h2, h3, h4, [class*='title'], [class*='titulo'], mat-card-title"
          );
          const title = titleEl?.textContent?.trim() ?? "";
          const descEl = card.querySelector(
            "p, [class*='desc'], [class*='body'], mat-card-content"
          );
          const description = descEl?.textContent?.trim() ?? null;
          const imgEl = card.querySelector("img") as HTMLImageElement | null;
          const imageUrl =
            imgEl?.getAttribute("data-src") ??
            imgEl?.getAttribute("data-lazy-src") ??
            (imgEl?.src && !imgEl.src.startsWith("data:") ? imgEl.src : null);
          const linkEl = (card.closest("a") ??
            card.querySelector("a")) as HTMLAnchorElement | null;
          const href = linkEl?.href ?? "";
          const sourceUrl = href && href !== url ? href : url;
          return { title, description, imageUrl, sourceUrl, rawText: card.textContent ?? "" };
        }),
        LIST_URL
      )
      .then((items) =>
        items
          .filter((item) => item.title.length > 0)
          .map((item) => {
            const combined = `${item.title} ${item.description ?? ""}`;
            return {
              bankId: BANK_ID,
              title: item.title,
              description: item.description,
              categoryId: detectCategory(combined),
              discountType: detectDiscountType(combined),
              discountValue: extractDiscountValue(combined),
              expiresAt:
                parseSpanishDate(item.description ?? "") ??
                parseSpanishDate(item.rawText),
              imageUrl: item.imageUrl,
              sourceUrl: item.sourceUrl,
            } satisfies RawPromo;
          })
      );

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
