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
const BASE_URL = "https://www.baccredomatic.com/es-sv/personas/promociones";
const MAX_PAGES = 20; // límite de seguridad para evitar loops infinitos

/** Extrae las promos visibles en la página actual */
async function scrapePage(page: import("playwright").Page, pageUrl: string) {
  return page.$$eval(".promotion-wrapper-item", (wrappers) =>
    wrappers.map((wrapper) => {
      const card = wrapper.querySelector(".real-estate-card");
      if (!card) return null;

      const wrapperId = wrapper.className.match(/item-(\d+)/)?.[1] ?? "";
      const imgEl = card.querySelector("img") as HTMLImageElement | null;
      const title = card.querySelector("h2.h2")?.textContent?.trim() ?? "";
      const validityText = card.querySelector("p.red-background-text")?.textContent?.trim() ?? "";
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
        sourceUrl: wrapperId ? `${location.origin}${location.pathname}#${wrapperId}` : location.href,
        rawText: wrapper.textContent ?? "",
      };
    })
  );
}

export async function bacCredomaticScraper(): Promise<void> {
  const startedAt = new Date().toISOString();
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    const allRawItems: Array<{
      title: string; description: string | null; validityText: string;
      imageUrl: string | null; sourceUrl: string; rawText: string;
    }> = [];

    let currentPage = 0;

    while (currentPage < MAX_PAGES) {
      const pageUrl = `${BASE_URL}?page=${currentPage}`;
      console.log(`[${BANK_ID}] Scrapeando página ${currentPage}: ${pageUrl}`);

      await page.goto(pageUrl, { waitUntil: "networkidle", timeout: 30_000 });
      await page.waitForSelector(".real-estate-card", { timeout: 15_000 });

      const items = await scrapePage(page, pageUrl);
      const valid = items.filter((i): i is NonNullable<typeof i> => i !== null && i.title.length > 0);
      allRawItems.push(...valid);
      console.log(`[${BANK_ID}] Página ${currentPage}: ${valid.length} promos`);

      // Verificar si hay página siguiente
      const hasNext = await page.$(".pager__link--next");
      if (!hasNext) {
        console.log(`[${BANK_ID}] No hay más páginas. Total: ${allRawItems.length} promos`);
        break;
      }

      currentPage++;
    }

    const rawPromos: RawPromo[] = allRawItems.map((item) => {
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
