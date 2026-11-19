import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { savePromos, logScraperRun } from "../src/lib/db";
import type { RawPromo } from "../src/scrapers/types";
import { parseSpanishDate } from "../src/scrapers/types";
import { getMetrics, getPromos } from "../../web/src/lib/queries";
import { runAllScrapers, runScraper } from "../src/scrapers";
import { chromium, type Page } from "playwright";
import { scrapeMiPromo } from "../src/scrapers/bac-mipromo";
import type { BankId } from "@promocards/types";
import { daysToPromoExpiry, getDayInElSalvador, getPromoDetails, isPromoCardsAdmin, isPromoValidToday, matchesMyCards, promoTerms, type Promo } from "@promocards/types";

// Fake HTTP boundary: these tests never connect to a real Supabase project.
process.env.SUPABASE_URL = "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only";
const originalFetch = globalThis.fetch;
const requests: Array<{ method: string; url: URL; body: unknown; prefer: string | null }> = [];
let failInsert = false;
let failRead = false;
const promo: RawPromo = {
  bankId: "fedecredito", title: "Oferta", description: null,
  categoryId: "otros", discountType: "percentage", discountValue: "20%",
  expiresAt: null, imageUrl: null, sourceUrl: "https://example.com/promo",
};

test("only server-managed roles or explicit Supabase user IDs grant admin access", () => {
  assert.equal(isPromoCardsAdmin({ id: "viewer", app_metadata: { role: "viewer" } }), false);
  assert.equal(isPromoCardsAdmin({ id: "owner", app_metadata: {} }, "another, owner "), true);
  assert.equal(isPromoCardsAdmin({ id: "admin", app_metadata: { role: "admin" } }), true);
  assert.equal(isPromoCardsAdmin({ id: "", app_metadata: {} }, ""), false);
});

test("promo terms and today use the Salvadoran calendar and known card eligibility", () => {
  const offer: Promo = {
    ...promo, id: "1", title: "Oferta en tienda",
    description: "Válida los domingos con tarjetas de crédito. Debes reportar tu compra.",
    expiresAt: "2026-11-23T05:59:59Z",
    isActive: true, createdAt: "", updatedAt: "",
  };
  const lastMinute = new Date("2026-11-23T05:58:00Z");
  assert.equal(getDayInElSalvador(lastMinute), 0);
  assert.equal(daysToPromoExpiry(offer.expiresAt!, lastMinute), 0);
  assert.equal(isPromoValidToday(offer, lastMinute), true);
  assert.equal(isPromoValidToday(offer, new Date("2026-11-23T06:00:00Z")), false);
  assert.equal(getPromoDetails(offer).requiresReport, true);
  assert.equal(matchesMyCards(offer, ["fedecredito"], { fedecredito: "debit" }), false);
  assert.equal(matchesMyCards(offer, ["fedecredito"], { fedecredito: "credit" }), true);
  assert.equal(promoTerms({ ...offer, expiresAt: null }).find((term) => term.label === "Vigencia")?.value, "Vigencia sin confirmar");
  assert.equal(promoTerms({ ...offer, expiresAt: null, details: { permanent: true } }).find((term) => term.label === "Vigencia")?.value, "Oferta permanente");
});

beforeEach(() => {
  delete process.env.SCRAPER_DRY_RUN;
  requests.length = 0;
  failInsert = false;
  failRead = false;
  globalThis.fetch = async (input, init) => {
    const method = init?.method ?? "GET";
    requests.push({ method, url: new URL(String(input)), body: init?.body ? JSON.parse(String(init.body)) : null,
      prefer: new Headers(init?.headers).get("prefer") });
    if ((method === "POST" && failInsert) || (method === "GET" && failRead)) {
      return new Response(JSON.stringify({ message: "simulated failure" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    if (method === "GET") return new Response(JSON.stringify([
      { id: "keep", bank_id: promo.bankId, source_url: promo.sourceUrl },
      { id: "obsolete", bank_id: promo.bankId, source_url: "https://example.com/old" },
    ]), { headers: { "Content-Type": "application/json" } });
    return new Response(null, { status: 204 });
  };
});
after(() => { globalThis.fetch = originalFetch; });

test("failed insertion preserves all previous promotions", async () => {
  failInsert = true;
  await assert.rejects(savePromos([promo]), /simulated failure/);
  assert.deepEqual(requests.map((r) => r.method), ["GET", "POST"]);
});

test("failed reading prevents all mutations", async () => {
  failRead = true;
  await assert.rejects(savePromos([promo]), /simulated failure/);
  assert.deepEqual(requests.map((r) => r.method), ["GET"]);
});

test("upsert deduplicates per bank, preserves identity and moderation, then removes only obsolete IDs", async () => {
  await savePromos([promo, promo, { ...promo, bankId: "credicomer" }]);
  assert.deepEqual(requests.map((r) => r.method), ["GET", "POST", "DELETE"]);
  const write = requests[1];
  assert.equal(write.url.searchParams.get("on_conflict"), "bank_id,source_url");
  assert.match(write.prefer!, /resolution=merge-duplicates/);
  const rows = write.body as Array<Record<string, unknown>>;
  assert.equal(rows.length, 2);
  assert.equal("id" in rows[0], false);
  assert.equal("is_active" in rows[0], false);
  assert.equal("created_at" in rows[0], false);
  assert.equal(requests[2].url.searchParams.get("id"), "in.(obsolete)");
});

test("empty extraction fails without touching stored data", async () => {
  await assert.rejects(savePromos([]), /no encontró promociones/);
  assert.equal(requests.length, 0);
});

test("MiPromo paginates the Salvadoran catalog and preserves the offer's official link and expiry", async () => {
  const offsets: number[] = [];
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://api.mipromo.com/api/finaluser/deals/find");
    assert.equal(init?.method, "POST");
    assert.equal(new Headers(init?.headers).get("country-id"), "60");
    const { pagers: { start, limit } } = JSON.parse((init?.body as URLSearchParams).get("data")!);
    offsets.push(start);
    const docs = Array.from({ length: Math.min(limit, 19 - start) }, (_, index) => ({
      id: String(start + index + 1),
      title: "Descuento en farmacias",
      merchant_slug: "farmacia",
      slug: "descuento",
      discount_percent_value: 10,
      validity_to: "2026-12-01T05:59:59Z",
      deal_is_permanent: start === 0,
    }));
    return Response.json({ code: 200, data: { response: { start, numFound: 19, docs } } });
  };
  const page = {
    evaluate: async (_parse: unknown, descriptions: string[]) => descriptions.map(() => null),
  } as unknown as Page;

  const promos = await scrapeMiPromo(page);
  assert.deepEqual(offsets, [0, 18]);
  assert.equal(promos.length, 19);
  assert.equal(promos[0].expiresAt, null);
  assert.deepEqual(promos[18], {
    bankId: "bac-credomatic",
    title: "Descuento en farmacias",
    description: null,
    categoryId: "farmacias",
    discountType: "percentage",
    discountValue: "10%",
    expiresAt: "2026-12-01T05:59:59Z",
    imageUrl: null,
    sourceUrl: "https://www.mipromo.com/sv/deal/19/farmacia/descuento",
    details: { merchantName: undefined, startsAt: undefined, permanent: false, conditions: undefined },
  });
});

test("MiPromo rejects a partial catalog before it can replace stored promotions", async () => {
  globalThis.fetch = async () =>
    Response.json({ code: 200, data: { response: { start: 0, numFound: 1, docs: [] } } });
  await assert.rejects(scrapeMiPromo({} as Page), /catálogo incompleto/);
});

test("promotion search matches products and shops and composes with bank and category filters", async () => {
  const base = {
    bank_id: "bac-credomatic",
    category_id: "almacenes",
    discount_type: "other",
    description: null,
    source_url: "https://example.com/oferta",
  };
  globalThis.fetch = async (input) => {
    const { searchParams } = new URL(String(input));
    assert.equal(searchParams.get("bank_id"), "eq.bac-credomatic");
    assert.equal(searchParams.get("category_id"), "eq.almacenes");
    assert.equal(searchParams.get("is_active"), "eq.true");
    return Response.json([
      { ...base, id: "1", title: "Arreglos para regalar", description: "Diseños florales de Florería Azul" },
      { ...base, id: "2", title: "Promoción del mes", source_url: "https://www.mipromo.com/sv/deal/2/floreria-azul/oferta" },
      { ...base, id: "3", title: "Arreglos para el hogar" },
    ]);
  };
  const filters = { bankId: "bac-credomatic", categoryId: "almacenes" } as const;
  const ids = async (search: string) => (await getPromos({ ...filters, search })).map(({ id }) => id);

  assert.deepEqual(await ids("FLORALES arreglos"), ["1"]);
  assert.deepEqual(await ids("floreria azul"), ["2", "1"]);
  assert.deepEqual(await ids("arreglso floralres"), ["1"]);
  assert.deepEqual(await ids("tienda inexistente"), []);
  assert.deepEqual(await ids("   "), ["1", "2", "3"]);
});

test("dry run extracts without database access, including run logging", async () => {
  process.env.SCRAPER_DRY_RUN = "true";
  await savePromos([promo]);
  await logScraperRun({ bankId: promo.bankId, status: "success", promosFound: 1,
    errorType: null, errorMessage: null, startedAt: new Date().toISOString() });
  assert.equal(requests.length, 0);
});

test("public queries exclude expired promotions and compare percentage discounts numerically", async () => {
  const urls: URL[] = [];
  globalThis.fetch = async (input) => {
    urls.push(new URL(String(input)));
    return new Response(JSON.stringify(["9%", "100%", "80%"].map((discount_value) => ({
      id: discount_value, bank_id: promo.bankId, title: "Oferta", category_id: "otros",
      discount_type: "percentage", discount_value, expires_at: null,
    }))), { headers: { "Content-Type": "application/json" } });
  };
  const metrics = await getMetrics();
  assert.equal(metrics.bestDiscountToday, "100%");
  assert.equal(metrics.totalActivePromos, 3);
  assert.equal(metrics.expiringThisWeek, 0);
  assert.match(urls[0].searchParams.get("or")!, /expires_at.is.null,expires_at.gte./);
  await getPromos({ bankId: "fedecredito", categoryId: "otros" });
  assert.equal(urls[1].searchParams.get("bank_id"), "eq.fedecredito");
  assert.equal(urls[1].searchParams.get("category_id"), "eq.otros");
});

test("browser launch failures reject individual and complete runs", async () => {
  process.env.SCRAPER_DRY_RUN = "true";
  const originalLaunch = chromium.launch;
  chromium.launch = async () => { throw new Error("simulated browser failure"); };
  try {
    await assert.rejects(runScraper("fedecredito"), /simulated browser failure/);
    await assert.rejects(runAllScrapers(), (error: unknown) => {
      assert.ok(error instanceof Error);
      for (const bank of ["fedecredito", "banco-industrial", "credicomer", "bac-credomatic", "credisiman", "banco-agricola", "banco-cuscatlan"]) {
        assert.ok(error.message.includes(bank));
      }
      return true;
    });
    await assert.rejects(runScraper("invalid" as BankId), /Scraper no encontrado/);
    assert.equal(requests.length, 0);
  } finally {
    chromium.launch = originalLaunch;
  }
});

test("expiration uses the end of a date range and the complete Salvadoran day", () => {
  assert.equal(parseSpanishDate("Del 1 de octubre de 2026 al 31 de octubre de 2026"), "2026-11-01T05:59:59.999Z");
  assert.equal(parseSpanishDate("Válido hasta el 31/10/2026"), "2026-11-01T05:59:59.999Z");
  assert.equal(parseSpanishDate("31/02/2026"), null);
  assert.equal(parseSpanishDate("29/02/2028"), "2028-03-01T05:59:59.999Z");
  assert.equal(parseSpanishDate("Sin fecha"), null);
});
