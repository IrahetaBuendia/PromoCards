import type { BankId } from "@promocards/types";
import { fedecreditoScraper } from "./fedecredito";
import { bancoIndustrialScraper } from "./banco-industrial";
import { credicomerScraper } from "./credicomer";
import { bacCredomaticScraper } from "./bac-credomatic";
import { credisimanScraper } from "./credisiman";
import { bancoAgricolaScraper } from "./banco-agricola";
import { bancoCuscatlanScraper } from "./banco-cuscatlan";
import type { ScraperFn } from "./types";

const scrapers: Record<BankId, ScraperFn> = {
  fedecredito: fedecreditoScraper,
  "banco-industrial": bancoIndustrialScraper,
  credicomer: credicomerScraper,
  "bac-credomatic": bacCredomaticScraper,
  credisiman: credisimanScraper,
  "banco-agricola": bancoAgricolaScraper,
  "banco-cuscatlan": bancoCuscatlanScraper,
};

export async function runAllScrapers(): Promise<void> {
  const bankIds = Object.keys(scrapers) as BankId[];

  const results = await Promise.allSettled(bankIds.map((bankId) => scrapers[bankId]()));
  const failures = results.flatMap((result, index) =>
    result.status === "rejected" ? [`${bankIds[index]}: ${String(result.reason)}`] : []
  );
  if (failures.length > 0) throw new Error(`Scrapers fallidos: ${failures.join("; ")}`);
}

export async function runScraper(bankId: BankId): Promise<void> {
  const scraper = scrapers[bankId];
  if (!scraper) throw new Error(`Scraper no encontrado: ${bankId}`);
  await scraper();
}
