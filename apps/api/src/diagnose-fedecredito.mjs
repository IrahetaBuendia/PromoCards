import { lookup } from "node:dns/promises";
import { chromium } from "playwright";

const url = "https://www.fedecredito.com.sv/promociones/todas";
console.log("DNS", await lookup(new URL(url).hostname, { all: true }));

try {
  const startedAt = Date.now();
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  const html = await response.text();
  console.log("HTTP", response.status, "elapsedMs", Date.now() - startedAt,
    "bytes", html.length, "promoLinks", html.split("/promociones/ver/").length - 1);
} catch (error) {
  console.error("HTTP_ERROR", error.message, error.cause?.code);
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const pending = new Set();
  page.on("request", request => pending.add(request.url()));
  page.on("requestfinished", request => pending.delete(request.url()));
  page.on("requestfailed", request => {
    pending.delete(request.url());
    console.log("REQUEST_FAILED", request.url(), request.failure()?.errorText);
  });
  page.on("response", response => {
    if (response.request().isNavigationRequest()) {
      console.log("NAVIGATION_RESPONSE", response.status(), response.url());
    }
  });
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    console.log("DOM_READY");
  } catch (error) {
    console.error("NAVIGATION_ERROR", error.message);
    process.exitCode = 1;
  }
  console.log("PAGE_URL", page.url());
  if (page.url() !== "about:blank") {
    const promoCount = await page.locator('a[href*="/promociones/ver/"]').count();
    console.log("PROMO_LINKS", promoCount);
    if (promoCount === 0) process.exitCode = 1;
  }
  console.log("PENDING_REQUESTS", [...pending]);
} finally {
  await browser.close();
}
