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
    await page.waitForSelector(".real-estate-card", { timeout: 15_000 });

    const rawPromos: RawPromo[] = await page
      .$$eval(".promotion-wrapper-item", (wrappers) =>
        wrappers.map((wrapper) => {
          const card = wrapper.querySelector(".real-estate-card");
          if (!card) return null;

          // ID del wrapper: "item-274631" → ancla "#274631"
          const wrapperId = wrapper.className.match(/item-(\d+)/)?.[1] ?? "";

          const imgEl = card.querySelector("img") as HTMLImageElement | null;
          const title = card.querySelector("h2.h2")?.textContent?.trim() ?? "";
          const validityText = card.querySelector("p.red-background-text")?.textContent?.trim() ?? "";

          // Descripción: todos los <p> sin clase
          const descParagraphs = Array.from(card.querySelectorAll("p:not([class])"))
            .map((p) => p.textContent?.trim())
            .filter(Boolean)
            .join(" ")
            .trim();

          return {
            title,
            description: descParagraphs || null,
            validityText,
            imageUrl: imgEl?.src && !imgEl.src.startsWith("data:") ? imgEl.src : null,
            sourceUrl: wrapperId ? `${location.href}#${wrapperId}` : location.href,
            rawText: wrapper.textContent ?? "",
          };
        })
      )
      .then((items) =>
        items
          .filter((item): item is NonNullable<typeof item> => item !== null && item.title.length > 0)
          .map((item) => {
            const combined = `${item.title} ${item.description ?? ""}`;
            return {
              bankId: BANK_ID,
              title: item.title,
              description: item.description,
              categoryId: detectCategory(combined),
              discountType: detectDiscountType(combined),
              discountValue: extractDiscountValue(combined),
              expiresAt: parseSpanishDate(item.validityText) ?? parseSpanishDate(item.rawText),
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
