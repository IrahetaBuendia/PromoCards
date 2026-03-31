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
const URL = "https://www.credicomer.com.sv/personas/promociones?type=emma";

export async function credicomerScraper(): Promise<void> {
  const startedAt = new Date().toISOString();
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.goto(URL, { waitUntil: "networkidle", timeout: 30_000 });

    // Credicomer usa Tailwind — esperar cualquier tarjeta con imagen y texto
    await page.waitForSelector("img", { timeout: 15_000 });
    // Dar tiempo extra para que el JS renderice las tarjetas
    await page.waitForTimeout(3_000);

    // Intentar selectores conocidos de Tailwind SPA; ajustar si retorna 0
    const rawPromos: RawPromo[] = await page
      .$$eval(
        // Busca contenedores tipo card: divs con rounded + shadow o border
        'div[class*="rounded"][class*="shadow"], div[class*="rounded"][class*="border"]',
        (cards) =>
          cards
            .filter((card) => {
              const text = card.textContent ?? "";
              return text.length > 30 && card.querySelector("img") !== null;
            })
            .map((card) => ({
              title:
                card.querySelector("h2, h3, h4, [class*='font-bold']")?.textContent?.trim() ?? "",
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
      errorType: message.includes("timeout") ? "timeout" : "selector-broken",
      errorMessage: message,
      startedAt,
    });
  } finally {
    await browser.close();
  }
}
