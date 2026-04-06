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
const BASE_URL = "https://www.bancocuscatlan.com";
const LIST_URL = `${BASE_URL}/tarjetas/promociones`;

export async function bancoCuscatlanScraper(): Promise<void> {
  const startedAt = new Date().toISOString();
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ "Accept-Language": "es-SV,es;q=0.9" });

    await page.goto(LIST_URL, { waitUntil: "networkidle", timeout: 60_000 });

    // Angular necesita tiempo extra para renderizar los componentes
    await page.waitForSelector(".square-promotion", { timeout: 20_000 });

    // Scroll para asegurar que se cargan todas las cards con lazy loading
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2_000);
    await page.evaluate(() => window.scrollTo(0, 0));

    const rawPromos: RawPromo[] = await page
      .$$eval(
        ".square-promotion",
        (cards, baseUrl) =>
          cards.map((card) => {
            // Tipo de oferta / descuento (ej: "15% OFF", "CUSCA CUOTAS", "MultiPuntos")
            const offerType =
              card.querySelector("p.container-offer")?.textContent?.trim() ?? "";

            // Nombre del comercio / descripción de la promo
            const placeEl = card.querySelector(
              ".container-information-promotion p:not(.container-offer)"
            );
            const place = placeEl?.textContent?.trim() ?? "";

            // Título: combina tipo de oferta + lugar/descripción
            const title = offerType && place
              ? `${offerType} - ${place}`
              : offerType || place;

            // Imagen de fondo de la card (imagen principal de la promo)
            const imgEl = card.querySelector(
              "img.img-background-promotion"
            ) as HTMLImageElement | null;
            const imageUrl = imgEl?.src ?? null;

            // URL fuente: enlace de la card al detalle de la promo
            const link = card.querySelector("a");
            const href = link?.getAttribute("href") ?? "";
            const sourceUrl = href
              ? href.startsWith("http") ? href : `${baseUrl}${href}`
              : baseUrl;

            return {
              title,
              offerType,
              imageUrl,
              sourceUrl,
              rawText: card.textContent?.trim() ?? "",
            };
          }),
        BASE_URL
      )
      .then((items) =>
        items
          .filter((item) => item.title.length > 0)
          .map((item) => {
            const combined = `${item.title} ${item.rawText}`;
            return {
              bankId: BANK_ID,
              title: item.title,
              description: null,
              categoryId: detectCategory(combined),
              discountType: detectDiscountType(combined),
              discountValue: extractDiscountValue(combined),
              expiresAt: parseSpanishDate(item.rawText),
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
