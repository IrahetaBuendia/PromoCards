/**
 * Entry point para correr scrapers desde GitHub Actions (o CLI).
 * Uso:
 *   tsx src/scrape.ts              → corre todos los bancos
 *   tsx src/scrape.ts bac-credomatic → corre solo ese banco
 *
 * Las variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 * deben estar disponibles (vía GitHub Actions secrets o .env local).
 */
import dotenv from "dotenv";
import { join } from "path";

// En local carga el .env de la raíz; en GitHub Actions las vars vienen del workflow
dotenv.config({ path: join(process.cwd(), "../../.env") });

import { runAllScrapers, runScraper } from "./scrapers";
import { deleteAllPromos } from "./lib/db";
import type { BankId } from "@promocards/types";

// Acepta el banco como argumento CLI o como variable de entorno
const bankId = (process.argv[2] ?? process.env.BANK_ID ?? "") as BankId | "";

async function main() {
  if (bankId) {
    console.log(`[scrape] Iniciando scraper: ${bankId}`);
    await runScraper(bankId);
    console.log(`[scrape] ✓ ${bankId} completado`);
  } else {
    console.log("[scrape] Limpiando tabla de promos…");
    await deleteAllPromos();
    console.log("[scrape] Iniciando todos los scrapers…");
    await runAllScrapers();
    console.log("[scrape] ✓ Todos los scrapers completados");
  }
}

main().then(() => process.exit(0)).catch((err) => {
  console.error("[scrape] Error fatal:", err);
  process.exit(1);
});
