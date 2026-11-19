import type { Page } from "playwright";
import { z } from "zod";
import { detectCategory, detectDiscountType, extractDiscountValue, type RawPromo } from "./types";

const SEARCH_URL = "https://api.mipromo.com/api/finaluser/deals/find";
const PORTAL_URL = "https://www.mipromo.com/sv";
const IMAGE_ORIGIN = "https://mipromoimages.geopagoscdn.net";
const PAGE_SIZE = 18;
const MAX_PAGES = 50;

const searchResult = z.object({
  code: z.literal(200),
  data: z.object({
    response: z.object({
      numFound: z.number().int().nonnegative(),
      start: z.number().int().nonnegative(),
      docs: z.array(z.object({
        id: z.string().regex(/^\d+$/),
        title: z.string().trim().min(1),
        merchant_slug: z.string().min(1),
        slug: z.string().min(1),
        merchant_name: z.string().nullish(),
        category_translation: z.string().nullish(),
        subcategory_translation: z.string().nullish(),
        description: z.string().nullish(),
        discount_percent_value: z.number().nullish(),
        discount_type_description: z.string().nullish(),
        validity_to: z.string().datetime().nullish(),
        deal_is_permanent: z.boolean(),
        _childDocuments_: z.object({
          IMAGE: z.array(z.object({
            image_filepath: z.string().regex(/^\/imageFiles\/\d+\/?$/),
            image_filename: z.string().min(1),
          })).optional(),
        }).optional(),
      })),
    }),
  }),
});

export async function scrapeMiPromo(page: Page): Promise<RawPromo[]> {
  type Deal = z.infer<typeof searchResult>["data"]["response"]["docs"][number];
  const deals = new Map<string, Deal>();
  let total: number | undefined;

  for (let pageNumber = 0; pageNumber < MAX_PAGES; pageNumber++) {
    const start = pageNumber * PAGE_SIZE;
    // El portal usa este POST para consultar el catálogo público de El Salvador (60).
    const response = await fetch(SEARCH_URL, {
      method: "POST",
      headers: { locale: "es", "country-id": "60" },
      body: new URLSearchParams({
        data: JSON.stringify({
          filters: [],
          sorters: [{ field: "id", order: "asc" }],
          pagers: { start, limit: PAGE_SIZE },
        }),
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`MiPromo respondió HTTP ${response.status}`);

    const { data: { response: { docs, numFound, start: returnedStart } } } =
      searchResult.parse(await response.json());
    total ??= numFound;
    if (
      total !== numFound ||
      returnedStart !== start ||
      docs.length !== Math.min(PAGE_SIZE, total - start)
    ) {
      throw new Error("MiPromo devolvió un catálogo incompleto o cambió durante la consulta");
    }

    for (const deal of docs) {
      if (deals.has(deal.id)) throw new Error(`MiPromo repitió la oferta ${deal.id}`);
      deals.set(deal.id, deal);
    }
    if (deals.size === total) break;
  }

  if (deals.size !== total) throw new Error("MiPromo excedió el límite de páginas");

  const items = [...deals.values()];
  const descriptions = await page.evaluate((htmlList) => {
    const template = document.createElement("template");
    return htmlList.map((html) => {
      template.innerHTML = html;
      template.content.querySelectorAll("script, style").forEach((element) => element.remove());
      template.content.querySelectorAll("br, p, li, div").forEach((element) => element.after(" "));
      return template.content.textContent?.replace(/\s+/g, " ").trim() || null;
    });
  }, items.map((deal) => deal.description ?? ""));

  return items.map((deal, index) => {
    const description = descriptions[index];
    const categoryText = [
      deal.title, deal.merchant_name, deal.category_translation, deal.subcategory_translation, description,
    ].join(" ");
    const discountText = `${deal.title} ${deal.discount_type_description ?? ""}`;
    const percentage = deal.discount_percent_value;
    const reportedType = detectDiscountType(discountText);
    const discountValue = extractDiscountValue(discountText) ||
      (percentage && percentage > 0 ? `${percentage}%` : "");
    const image = deal._childDocuments_?.IMAGE?.[0];

    return {
      bankId: "bac-credomatic",
      title: deal.title,
      description,
      categoryId: detectCategory(categoryText),
      discountType: reportedType === "other" && percentage && percentage > 0 ? "percentage" : reportedType,
      discountValue,
      expiresAt: deal.deal_is_permanent ? null : deal.validity_to ?? null,
      imageUrl: image
        ? `${IMAGE_ORIGIN}${image.image_filepath.replace(/\/$/, "")}/${encodeURIComponent(image.image_filename)}`
        : null,
      sourceUrl: `${PORTAL_URL}/deal/${deal.id}/${encodeURIComponent(deal.merchant_slug)}/${encodeURIComponent(deal.slug)}`,
    };
  });
}
