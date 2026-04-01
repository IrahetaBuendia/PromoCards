import { chromium } from "playwright";
import {
  detectCategory,
  detectDiscountType,
  extractDiscountValue,
  parseSpanishDate,
  type RawPromo,
} from "./types";
import { savePromos, logScraperRun } from "../lib/db";

const BANK_ID = "banco-industrial" as const;
const URL = "https://www.corporacionbi.com/sv/bancoindustrialsv/promociones";

export async function bancoIndustrialScraper(): Promise<void> {
  const startedAt = new Date().toISOString();
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.goto(URL, { waitUntil: "networkidle", timeout: 30_000 });

    // WordPress con WPBakery — las tarjetas están en .content-promociones > .vc_col-sm-4
    await page.waitForSelector(".content-promociones .vc_col-sm-4", { timeout: 15_000 });

    // Scroll para activar lazy loading
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1_500);

    const rawPromos: RawPromo[] = await page
      .$$eval(".content-promociones .vc_col-sm-4", (cards) =>
        cards.map((card) => {
          const imgEl = card.querySelector("img") as HTMLImageElement | null;
          // Imagen lazy: usar data-lazy-src si src es placeholder SVG
          const imageUrl =
            imgEl?.getAttribute("data-lazy-src") ??
            (imgEl?.src && !imgEl.src.startsWith("data:") ? imgEl.src : null);

          const title = card.querySelector("h2")?.textContent?.trim() ?? "";
          // Capturar TODOS los párrafos para tener descripción completa con condiciones
          const allPs = Array.from(card.querySelectorAll("p"))
            .map((p) => p.textContent?.trim())
            .filter(Boolean)
            .join(" ");
          const description = allPs || card.querySelector("p")?.textContent?.trim() || null;
          // SIEMPRE usar slug — los links de WordPress BI usan href="#" (todos iguales)
          // lo que causaba que la deduplicación descartara promos con el mismo href
          const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").substring(0, 60);
          const sourceUrl = `https://www.corporacionbi.com/sv/bancoindustrialsv/promociones#${slug}`;

          return {
            title,
            description,
            imageUrl,
            sourceUrl,
            rawText: card.textContent ?? "",
          };
        })
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
