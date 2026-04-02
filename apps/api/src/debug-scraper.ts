/**
 * debug-scraper.ts — Imprime en consola los datos crudos de un banco sin guardar en DB.
 * Uso: pnpm exec tsx src/debug-scraper.ts [banco]
 * Ejemplo: pnpm exec tsx src/debug-scraper.ts banco-industrial
 */
import "dotenv/config";
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.join(process.cwd(), "../../.env") });

import { chromium } from "playwright";
import { detectCategory, detectDiscountType, extractDiscountValue, parseSpanishDate } from "./scrapers/types";

const BANK = process.argv[2] ?? "banco-industrial";

async function debugBI() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("https://www.corporacionbi.com/sv/bancoindustrialsv/promociones", {
    waitUntil: "networkidle", timeout: 30_000,
  });
  await page.waitForSelector(".content-promociones .vc_col-sm-4", { timeout: 15_000 });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2_000);

  const items = await page.$$eval(".content-promociones .vc_col-sm-4", (cards) =>
    cards.map((card) => {
      const title = card.querySelector("h2")?.textContent?.trim() ?? "";
      const description = card.querySelector("p")?.textContent?.trim() ?? null;
      const allPs = Array.from(card.querySelectorAll("p")).map(p => p.textContent?.trim()).filter(Boolean);
      const imgEl = card.querySelector("img") as HTMLImageElement | null;
      const imageUrl = imgEl?.getAttribute("data-lazy-src") ?? (imgEl?.src && !imgEl.src.startsWith("data:") ? imgEl.src : null);
      const linkEl = card.querySelector("a") as HTMLAnchorElement | null;
      return { title, description, allPs, imageUrl, linkHref: linkEl?.href ?? null, rawText: card.textContent?.substring(0, 300) ?? "" };
    })
  );

  await browser.close();
  return items;
}

async function debugFedecredito() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("https://www.fedecredito.com.sv/promociones/todas", { waitUntil: "networkidle", timeout: 30_000 });
  await page.waitForSelector('a[href*="/promociones/ver/"]', { timeout: 15_000 });

  const summaries = await page.$$eval('a[href*="/promociones/ver/"]', (links) =>
    links.map((link) => ({
      title: link.querySelector("p.text-green")?.textContent?.trim() ?? "",
      allPs: Array.from(link.querySelectorAll("p")).map(p => p.textContent?.trim()).filter(Boolean),
      sourceUrl: (link as HTMLAnchorElement).href,
    }))
  );

  // Navegar a cada promo individualmente para ver descripción completa
  const detailPage = await browser.newPage();
  const detailed = [];
  for (const s of summaries.slice(0, 10)) { // máximo 10 para debug
    let detail = "";
    try {
      await detailPage.goto(s.sourceUrl, { waitUntil: "domcontentloaded", timeout: 10_000 });
      detail = await detailPage.evaluate(() => document.body.textContent?.replace(/\s+/g, " ").trim().substring(0, 500) ?? "");
    } catch { detail = "(error navegando)"; }
    detailed.push({ ...s, fullText: detail });
  }
  await browser.close();
  return detailed;
}

async function debugCredicomer() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const BASE = "https://www.credicomer.com.sv";
  const apiResponses: any[] = [];
  const allUrls: string[] = [];

  page.on("response", async (response) => {
    const url = response.url();
    allUrls.push(`[${response.status()}] ${url}`);
    if (url.includes("/api/promotions") && !url.includes("/image") && response.status() === 200) {
      try {
        const ct = response.headers()["content-type"] ?? "";
        if (ct.includes("application/json")) {
          const json = await response.json();
          console.log(`  → JSON capturado de ${url}:`, JSON.stringify(json).substring(0, 300));
          if (Array.isArray(json)) apiResponses.push(...json);
          else if (Array.isArray(json?.data)) apiResponses.push(...json.data);
          else if (Array.isArray(json?.promotions)) apiResponses.push(...json.promotions);
          else apiResponses.push(json); // guardar como sea para inspeccionarlo
        }
      } catch { /* ignorar */ }
    }
  });

  await page.goto(`${BASE}/personas/promociones`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForSelector("img[src*='/api/promotions/']", { timeout: 20_000 }).catch(() => {});
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2_000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(3_000);

  // Contar imágenes en el DOM para comparar
  const domImgCount = await page.$$eval("img[src*='/api/promotions/']", (imgs) => imgs.length).catch(() => 0);
  console.log(`\n  DOM images encontradas: ${domImgCount}`);
  console.log(`  API JSON interceptado: ${apiResponses.length} items`);
  console.log(`\n  Todas las URLs de red capturadas:`);
  allUrls.filter(u => u.includes("credicomer") || u.includes("/api/")).forEach(u => console.log(`    ${u}`));

  await browser.close();

  // Imprimir estructura del primer item para ver los campos
  if (apiResponses.length > 0) {
    console.log(`\n  Estructura del primer item JSON:`);
    console.log(JSON.stringify(apiResponses[0], null, 2));
    console.log(`\n  Títulos encontrados en la API:`);
    apiResponses.forEach((item: any, i: number) => {
      const t = item.title ?? item.name ?? item.nombre ?? item.titulo ?? item.promotion_name ?? item.heading ?? "(sin título)";
      console.log(`    [${i+1}] "${t}" — keys: ${Object.keys(item).join(", ")}`);
    });
  }

  return apiResponses.map((item: any) => ({
    title: item.title ?? item.name ?? item.nombre ?? "(sin título)",
    rawItem: JSON.stringify(item).substring(0, 200),
  }));
}

(async () => {
  console.log(`\n====== DEBUG SCRAPER: ${BANK} ======\n`);

  try {
    let items: any[] = [];

    if (BANK === "banco-industrial") {
      items = await debugBI();
    } else if (BANK === "fedecredito") {
      items = await debugFedecredito();
    } else if (BANK === "credicomer") {
      items = await debugCredicomer();
    } else {
      console.error("Banco no soportado en debug. Usa: banco-industrial | fedecredito | credicomer");
      process.exit(1);
    }

    console.log(`Total tarjetas encontradas: ${items.length}\n`);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const combined = `${item.title ?? ""} ${item.description ?? item.fullText ?? ""}`;
      const category = detectCategory(combined);
      console.log(`--- [${i + 1}] ---`);
      console.log(`  Título:    "${item.title}"`);
      console.log(`  Categoría detectada: ${category}`);
      if (item.description) console.log(`  Descripción: "${item.description?.substring(0, 150)}"`);
      if (item.fullText) console.log(`  Texto completo (500 chars): "${item.fullText?.substring(0, 300)}"`);
      if (item.allPs?.length) console.log(`  Párrafos: ${JSON.stringify(item.allPs)}`);
      if (item.rawText) console.log(`  rawText: "${item.rawText?.substring(0, 150)}"`);
      console.log();
    }
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
})();
