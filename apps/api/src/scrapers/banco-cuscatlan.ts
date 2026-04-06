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

// Selectores candidatos en orden de especificidad
const CARD_SELECTORS = [
  ".promo-card",
  ".promotion-card",
  "[class*='promo-item']",
  "[class*='PromoCard']",
  "[class*='promo_item']",
  ".card--promo",
  "article.card",
  ".promotions-list li",
  ".promo-grid .item",
  ".swiper-slide[class*='promo']",
];

export async function bancoCuscatlanScraper(): Promise<void> {
  const startedAt = new Date().toISOString();
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();

    // User-agent estándar para evitar bloqueos básicos
    await page.setExtraHTTPHeaders({
      "Accept-Language": "es-SV,es;q=0.9",
    });

    await page.goto(LIST_URL, { waitUntil: "networkidle", timeout: 30_000 });

    // Scroll para activar lazy loading
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2_000);
    await page.evaluate(() => window.scrollTo(0, 0));

    // Intentar encontrar el selector correcto
    let workingSelector: string | null = null;
    for (const sel of CARD_SELECTORS) {
      const count = await page.$$eval(sel, (els) => els.length);
      if (count > 0) {
        workingSelector = sel;
        console.log(`[${BANK_ID}] Selector encontrado: "${sel}" (${count} elementos)`);
        break;
      }
    }

    if (!workingSelector) {
      throw new Error(
        `No se encontró ningún selector de promos en ${LIST_URL}. ` +
          `Selectores probados: ${CARD_SELECTORS.join(", ")}`
      );
    }

    const rawPromos: RawPromo[] = await page
      .$$eval(workingSelector, (cards, url) =>
        cards.map((card) => {
          // Título: h2 > h3 > primer párrafo con texto > alt de imagen
          const titleEl =
            card.querySelector("h2, h3, h4") ??
            card.querySelector("[class*='title'], [class*='titulo']");
          const title = titleEl?.textContent?.trim() ?? "";

          // Descripción: párrafos restantes
          const descParts = Array.from(
            card.querySelectorAll("p, [class*='desc'], [class*='text']")
          )
            .map((el) => el.textContent?.trim())
            .filter((t) => t && t !== title)
            .join("\n")
            .trim();
          const description = descParts || null;

          // Imagen: src > data-src > data-lazy-src > background-image
          const imgEl = card.querySelector("img") as HTMLImageElement | null;
          let imageUrl: string | null =
            imgEl?.getAttribute("data-src") ??
            imgEl?.getAttribute("data-lazy-src") ??
            (imgEl?.src && !imgEl.src.startsWith("data:") ? imgEl.src : null);

          if (!imageUrl) {
            const bgEl =
              card.querySelector("[style*='background-image']") ?? card;
            const bgStyle =
              bgEl instanceof HTMLElement ? bgEl.style.backgroundImage : "";
            const match = bgStyle.match(/url\(['"]?([^'")\s]+)['"]?\)/);
            if (match?.[1]) imageUrl = match[1];
          }

          // URL fuente: enlace del card o de su ancestro más cercano
          const linkEl = (card.closest("a") ??
            card.querySelector("a")) as HTMLAnchorElement | null;
          const href = linkEl?.href ?? "";
          const sourceUrl =
            href && href !== url ? href : `${url}#${title.substring(0, 40).replace(/\s+/g, "-").toLowerCase()}`;

          return {
            title,
            description,
            imageUrl,
            sourceUrl,
            rawText: card.textContent ?? "",
          };
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
