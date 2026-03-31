import { chromium } from "playwright";
import {
  detectCategory,
  detectDiscountType,
  extractDiscountValue,
  parseSpanishDate,
  type RawPromo,
} from "./types";
import { savePromos, logScraperRun } from "../lib/db";

const BANK_ID = "bac-credomatic" as const;
const URL = "https://www.baccredomatic.com/es-sv/personas/promociones";

export async function bacCredomaticScraper(): Promise<void> {
  const startedAt = new Date().toISOString();
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.goto(URL, { waitUntil: "networkidle", timeout: 30_000 });

    // BAC usa .promotion-card como contenedor principal
    await page.waitForSelector(".promotion-card", { timeout: 15_000 });

    const rawPromos: RawPromo[] = await page
      .$$eval(".promotion-card", (cards) =>
        cards.map((card) => ({
          title: card.querySelector(".promotion-title")?.textContent?.trim() ?? "",
          description:
            card.querySelector(".promotion-description")?.textContent?.trim() ?? null,
          validityText:
            card.querySelector(".promotion-validity")?.textContent?.trim() ?? "",
          imageUrl: (card.querySelector(".promotion-image") as HTMLImageElement)?.src ?? null,
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
              expiresAt:
                parseSpanishDate(item.validityText) ??
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
