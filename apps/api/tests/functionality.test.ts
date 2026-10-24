import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { savePromos, logScraperRun } from "../src/lib/db";
import type { RawPromo } from "../src/scrapers/types";
import { parseSpanishDate } from "../src/scrapers/types";
import { getMetrics, getPromos } from "../../web/src/lib/queries";
import { runAllScrapers, runScraper } from "../src/scrapers";
import { chromium } from "playwright";
import type { BankId } from "@promocards/types";

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
