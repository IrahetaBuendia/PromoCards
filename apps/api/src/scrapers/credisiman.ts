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
const BASE_URL = "https://www.credisiman.com";
const LIST_URL = `${BASE_URL}/promotion/SV`;
const MAX_API_PAGES = 30;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractApiItems(json: any): any[] {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.response?.content)) return json.response.content;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.content)) return json.content;
  if (Array.isArray(json?.promotions)) return json.promotions;
  if (Array.isArray(json?.response)) return json.response;
  return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTotalPages(json: any): number | null {
  const root = json?.response ?? json;
  const candidates = [root?.totalPages, root?.total_pages, root?.pages, root?.lastPage];
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function extractPageFromUrl(url: string): number {
  try {
    const parsed = new URL(url);
    const page = parsed.searchParams.get("page") ?? parsed.searchParams.get("pageNumber");
    const n = Number(page);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function buildPageUrl(url: string, pageNumber: number): string {
  const parsed = new URL(url);
  if (parsed.searchParams.has("page")) parsed.searchParams.set("page", String(pageNumber));
  else if (parsed.searchParams.has("pageNumber")) parsed.searchParams.set("pageNumber", String(pageNumber));
  else parsed.searchParams.set("page", String(pageNumber));
  return parsed.toString();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPagedPostData(postData: string | null, pageNumber: number): any {
  if (!postData) return undefined;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = JSON.parse(postData);

    if (typeof body.page === "number" || typeof body.page === "string") body.page = pageNumber;
    else if (typeof body.pageNumber === "number" || typeof body.pageNumber === "string") body.pageNumber = pageNumber;
    else if (typeof body.number === "number" || typeof body.number === "string") body.number = pageNumber;
    else if (body.pageable && typeof body.pageable === "object") {
      if ("page" in body.pageable) body.pageable.page = pageNumber;
      else if ("pageNumber" in body.pageable) body.pageable.pageNumber = pageNumber;
      else body.pageable.page = pageNumber;
    } else {
      body.page = pageNumber;
    }

    return body;
  } catch {
    return postData;
  }
}

export async function credisimanScraper(): Promise<void> {
  const startedAt = new Date().toISOString();
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({
      "Accept-Language": "es-SV,es;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    // Interceptar API de Credisiman (ingress-prd.credisiman.com)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apiPromos: any[] = [];
    let pagedEndpoint: { url: string; method: string; postData: string | null } | null = null;
    let initialTotalPages: number | null = null;

    page.on("response", async (response) => {
      const url = response.url();
      if (
        (url.includes("ingress-prd.credisiman.com/cards/promotions") ||
         url.includes("/api/promotion") ||
         url.includes("/promotion/api")) &&
        response.status() === 200
      ) {
        try {
          const contentType = response.headers()["content-type"] ?? "";
          if (contentType.includes("application/json")) {
            const json = await response.json();
            apiPromos.push(...extractApiItems(json));

            if (url.includes("/cards/promotions/paged") && !pagedEndpoint) {
              pagedEndpoint = {
                url,
                method: response.request().method(),
                postData: response.request().postData(),
              };
              initialTotalPages = extractTotalPages(json);
            }
          }
        } catch { /* ignorar */ }
      }
    });

    await page.goto(LIST_URL, { waitUntil: "networkidle", timeout: 30_000 });
    await page.waitForSelector(".card-item", { timeout: 15_000 });
    await page.waitForTimeout(1_500);

    if (apiPromos.length > 0) {
      const endpoint = pagedEndpoint as { url: string; method: string; postData: string | null } | null;
      if (!endpoint) {
        // Si no detectamos endpoint paginado, seguimos con lo capturado inicialmente.
      } else {
      const seenIds = new Set(
        apiPromos
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((item: any) => item?.id)
          .filter((id: unknown): id is string | number => id !== undefined && id !== null)
      );

      const firstPage = extractPageFromUrl(endpoint.url);
      const maxPagesToFetch = initialTotalPages
        ? Math.min(initialTotalPages, MAX_API_PAGES)
        : MAX_API_PAGES;

      for (let pageNumber = firstPage + 1; pageNumber < maxPagesToFetch; pageNumber++) {
        try {
          const url = buildPageUrl(endpoint.url, pageNumber);

          const response = await page.request.fetch(url, {
            method: endpoint.method,
            data: buildPagedPostData(endpoint.postData, pageNumber),
            timeout: 30_000,
          });

          if (!response.ok()) break;

          const json = await response.json();
          const items = extractApiItems(json);
          if (items.length === 0) break;

          let added = 0;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const item of items as any[]) {
            const itemId = item?.id;
            if (itemId !== undefined && itemId !== null) {
              if (seenIds.has(itemId)) continue;
              seenIds.add(itemId);
            }
            apiPromos.push(item);
            added++;
          }

          console.log(`[${BANK_ID}] Pagina ${pageNumber}: +${added} items (total ${apiPromos.length})`);

          if (!initialTotalPages && added === 0) break;
        } catch {
          break;
        }
      }
      }
    }

    // Si la API interceptada tiene datos, usarlos directamente
    if (apiPromos.length > 0) {
      console.log(`[${BANK_ID}] API capturada: ${apiPromos.length} items`);
      const rawPromos: RawPromo[] = apiPromos
        .filter((item) => {
          const t = item.title ?? item.name ?? item.nombre ?? item.titulo ?? "";
          return typeof t === "string" && t.trim().length > 0;
        })
        .map((item): RawPromo => {
          const title = (item.title ?? item.name ?? item.nombre ?? item.titulo ?? "").trim();
          const description = item.description ?? item.descripcion ?? item.terms ?? item.conditions ?? null;
          const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").substring(0, 60);
          const combined = [title, description ?? "", item.category ?? "", item.store ?? ""].join(" ");
          return {
            bankId: BANK_ID,
            title,
            description: typeof description === "string" ? description : null,
            categoryId: detectCategory(combined),
            discountType: detectDiscountType(combined),
            discountValue: extractDiscountValue(combined),
            expiresAt: parseSpanishDate(combined) ?? null,
            imageUrl: item.image
              ? `https://ingress-prd.credisiman.com/users/media/files?q=${encodeURIComponent(item.image)}`
              : null,
            sourceUrl: item.id
              ? `${LIST_URL}#${item.id}`
              : `${LIST_URL}#${slug}`,
          };
        });

      await savePromos(rawPromos);
      await logScraperRun({ bankId: BANK_ID, status: "success", promosFound: rawPromos.length, errorType: null, errorMessage: null, startedAt });
      console.log(`[${BANK_ID}] ${rawPromos.length} promos guardadas`);
      return;
    }

    // Fallback: scraping del DOM con extracción ampliada de texto
    const baseItems = await page.$$eval(".card-item", (cards) =>
      cards.map((card) => {
        const imgEl = card.querySelector("img.image-promotion") as HTMLImageElement | null;
        const title = card.querySelector("h5.title-promotion")?.textContent?.trim() ?? "";
        const verLink = card.querySelector("a") as HTMLAnchorElement | null;
        const href = verLink?.href ?? "";
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").substring(0, 60);

        // Intentar extraer descripción de elementos dentro del card
        // Credisiman a veces tiene un panel expandido con class "card-body" o "description"
        const bodyText = (
          card.querySelector(".card-body, .description, .promotion-body, .card-text, p")
          ?? null
        )?.textContent?.trim() ?? null;

        // rawText completo — incluye texto de secciones colapsadas en el DOM
        const rawText = card.textContent?.trim() ?? "";
        // Quitar el título del rawText para aislar la descripción
        const descCandidate = rawText.replace(title, "").trim();

        return {
          title,
          // Priorizar: bodyText explícito → descripción limpia del rawText
          descriptionRaw: bodyText ?? (descCandidate.length > 5 ? descCandidate : null),
          imageUrl: imgEl?.src && !imgEl.src.startsWith("data:") && !imgEl.src.startsWith("blob:") ? imgEl.src : null,
          href: href.startsWith("http") ? href : null,
          slug,
          rawText,
        };
      })
    );

    // Para cada tarjeta que tiene un link individual, navegar a él y obtener descripción
    const detailPage = await browser.newPage();
    await detailPage.setExtraHTTPHeaders({
      "Accept-Language": "es-SV,es;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    const enriched: { description: string | null; rawText: string }[] = [];

    for (const item of baseItems) {
      if (item.href && item.href !== LIST_URL) {
        try {
          await detailPage.goto(item.href, { waitUntil: "domcontentloaded", timeout: 10_000 });
          const detail = await detailPage.evaluate(() => {
            // Buscar el bloque de descripción/condiciones en la página de detalle
            const selectors = [
              ".promotion-detail",
              ".promotion-description",
              ".terms-conditions",
              ".card-detail",
              "main p",
              ".container p",
              "[class*='description']",
              "[class*='detail']",
              "[class*='condition']",
            ];
            for (const sel of selectors) {
              const el = document.querySelector(sel);
              if (el && el.textContent && el.textContent.trim().length > 10) {
                return el.textContent.trim();
              }
            }
            return null;
          });
          enriched.push({ description: detail, rawText: await detailPage.evaluate(() => document.body.textContent ?? "") });
        } catch {
          enriched.push({ description: item.descriptionRaw, rawText: item.rawText });
        }
      } else {
        enriched.push({ description: item.descriptionRaw, rawText: item.rawText });
      }
    }

    await detailPage.close();

    const rawPromos: RawPromo[] = baseItems
      .filter((item) => item.title.length > 0)
      .map((item, i) => {
        const detail = enriched[i] ?? { description: null, rawText: "" };
        const description = detail.description;
        const combined = `${item.title} ${description ?? ""}`;
        return {
          bankId: BANK_ID,
          title: item.title,
          description,
          categoryId: detectCategory(combined),
          discountType: detectDiscountType(combined),
          discountValue: extractDiscountValue(combined),
          expiresAt: parseSpanishDate(detail.rawText) ?? parseSpanishDate(item.rawText),
          imageUrl: item.imageUrl,
          sourceUrl: item.href ?? `${LIST_URL}#${item.slug}`,
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
      errorType: message.includes("timeout") ? "timeout" : "ip-blocked",
      errorMessage: message,
      startedAt,
    });
  } finally {
    await browser.close();
  }
}
