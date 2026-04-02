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
    await page.setExtraHTTPHeaders({
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await page.waitForSelector(".promos-mes-item", { timeout: 30_000 });

    const rawPromos: RawPromo[] = await page
      .$$eval(".promos-mes-item", (cards) =>
        cards.map((card) => {
          const store = card.querySelector("label.promos-mes-comercio")?.textContent?.trim() ?? "";
          const title = card.querySelector("label.promos-mes-titulo-promo")?.textContent?.trim() ?? "";
          const description = card.querySelector("p.promos-mes-descripcion")?.textContent?.trim() ?? null;
          const verMas = card.querySelector("a.ver-mas");
          const promoId = verMas?.getAttribute("id2") ?? verMas?.getAttribute("id") ?? "";
          const imgEl = card.querySelector(".promos-mes-item-imagen img") as HTMLImageElement | null;
          const imageUrl = imgEl?.src && !imgEl.src.startsWith("data:") ? imgEl.src : null;

          // Si hay store y título, combinarlos para contexto completo
          const displayTitle = store && title
            ? `${store} — ${title}`
            : title || store;

          return {
            store,
            title: displayTitle,
            description,
            imageUrl,
            sourceUrl: promoId ? `${location.href}#${promoId}` : location.href,
            rawText: card.textContent ?? "",
          };
        })
      )
      .then((items) =>
        items
          .filter((item) => item.title.length > 0)
          .map((item) => {
            const combined = `${item.store} ${item.title} ${item.description ?? ""}`;
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
