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
const URL = "https://www.credisiman.com/promotion/SV";

export async function credisimanScraper(): Promise<void> {
  const startedAt = new Date().toISOString();
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();

    // Credisiman tiene protección DigiCert — simular navegador real
    await page.setExtraHTTPHeaders({
      "Accept-Language": "es-SV,es;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    await page.goto(URL, { waitUntil: "networkidle", timeout: 30_000 });
    await page.waitForTimeout(3_000);

    // Intentar selectores genéricos de tarjetas con imagen
    const rawPromos: RawPromo[] = await page
      .$$eval(
        "article, .card, .promotion, .promo, [class*='card'], [class*='promo']",
        (cards) =>
          cards
            .filter((card) => (card.textContent ?? "").length > 20)
            .map((card) => ({
              title:
                card.querySelector("h1, h2, h3, h4, strong")?.textContent?.trim() ?? "",
              description: card.querySelector("p")?.textContent?.trim() ?? null,
              imageUrl: (card.querySelector("img") as HTMLImageElement)?.src ?? null,
              sourceUrl: (card.querySelector("a") as HTMLAnchorElement)?.href ?? URL,
              rawText: card.textContent ?? "",
            }))
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
      errorType: message.includes("timeout") ? "timeout" : "ip-blocked",
      errorMessage: message,
      startedAt,
    });
  } finally {
    await browser.close();
  }
}
