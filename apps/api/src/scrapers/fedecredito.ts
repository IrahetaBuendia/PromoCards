import { chromium } from "playwright";
import {
  detectCategory,
  detectDiscountType,
  extractDiscountValue,
  parseSpanishDate,
  type RawPromo,
} from "./types";
import { savePromos, logScraperRun } from "../lib/db";

const BANK_ID = "fedecredito" as const;
const LIST_URL = "https://www.fedecredito.com.sv/promociones/todas";

export async function fedecreditoScraper(): Promise<void> {
  const startedAt = new Date().toISOString();
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.goto(LIST_URL, { waitUntil: "networkidle", timeout: 30_000 });
    await page.waitForSelector('a[href*="/promociones/ver/"]', { timeout: 15_000 });

    // La página de lista ya contiene la descripción completa en los <p>
    // Las páginas individuales muestran banner de cookies que bloquea el contenido
    const rawPromos: RawPromo[] = await page.$$eval(
      'a[href*="/promociones/ver/"]',
      (links) =>
        links.map((link) => {
          const title =
            link.querySelector("p.text-green")?.textContent?.trim() ?? "";

          // Capturar TODOS los párrafos excepto el título (incluye condiciones y fecha)
          const descParagraphs = Array.from(link.querySelectorAll("p:not(.text-green)"))
            .map((p) => p.textContent?.trim())
            .filter(Boolean)
            .join("\n")
            .trim();

          const imageUrl =
            (link.querySelector("img") as HTMLImageElement | null)?.src ?? null;
          const sourceUrl = (link as HTMLAnchorElement).href;
          // rawText completo para parsear fechas con contexto
          const rawText = link.textContent ?? "";

          return { title, descParagraphs, imageUrl, sourceUrl, rawText };
        })
    ).then((items) =>
      items
        .filter((item) => item.title.length > 0)
        .map((item) => {
          const description = item.descParagraphs || null;
          const combined = `${item.title} ${description ?? ""}`;
          return {
            bankId: BANK_ID,
            title: item.title,
            description,
            categoryId: detectCategory(combined),
            discountType: detectDiscountType(combined),
            discountValue: extractDiscountValue(combined),
            // Buscar fecha tanto en descripción como en rawText completo
            expiresAt:
              parseSpanishDate(description ?? "") ??
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
