import { chromium } from "playwright";
import {
  detectCategory,
  detectDiscountType,
  extractDiscountValue,
  parseSpanishDate,
  type RawPromo,
} from "./types";
import { savePromos, logScraperRun } from "../lib/db";

const BANK_ID = "banco-agricola" as const;
const URL = "https://www.bancoagricola.com/promociones";

export async function bancoAgricolaScraper(): Promise<void> {
  const startedAt = new Date().toISOString();
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.goto(URL, { waitUntil: "networkidle", timeout: 30_000 });

    await page.waitForSelector(".promos-mes-item", { timeout: 15_000 });

    const rawPromos: RawPromo[] = await page
      .$$eval(".promos-mes-item", (cards) =>
        cards.map((card) => ({
          title:
            card.querySelector(".promos-mes-titulo-promo")?.textContent?.trim() ??
            card.querySelector("h3, h4")?.textContent?.trim() ??
            "",
          description: card.querySelector("p")?.textContent?.trim() ?? null,
          imageUrl:
            (card.querySelector(".promos-mes-item-imagen img") as HTMLImageElement)?.src ??
            (card.querySelector("img") as HTMLImageElement)?.src ??
            null,
          sourceUrl:
            (card.querySelector("a") as HTMLAnchorElement)?.href ?? URL,
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
      errorType: message.includes("timeout") ? "timeout" : "selector-broken",
      errorMessage: message,
      startedAt,
    });
  } finally {
    await browser.close();
  }
}
