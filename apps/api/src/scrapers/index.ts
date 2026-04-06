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

  await Promise.allSettled(
    bankIds.map(async (bankId) => {
      try {
        await scrapers[bankId]();
      } catch (error) {
        console.error(`[${bankId}] Error inesperado:`, error);
      }
    })
  );
}

export async function runScraper(bankId: BankId): Promise<void> {
  const scraper = scrapers[bankId];
  if (!scraper) throw new Error(`Scraper no encontrado: ${bankId}`);
  await scraper();
}
