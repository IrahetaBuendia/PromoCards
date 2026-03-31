import cron from "node-cron";
import { runAllScrapers } from "./scrapers";

/**
 * Corre todos los scrapers cada 4 horas.
 * Expresión cron: minuto 0 de cada 4 horas.
 */
export function startScheduler() {
  console.log("Scheduler iniciado — scrapers correrán cada 4 horas");

  cron.schedule("0 */4 * * *", async () => {
    console.log(`[${new Date().toISOString()}] Iniciando scraping de todos los bancos...`);
    await runAllScrapers();
  });
}
