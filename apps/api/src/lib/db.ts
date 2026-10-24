// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { createClient } from "@supabase/supabase-js";
import type { BankId, ScraperErrorType, ScraperStatus } from "@promocards/types";
import type { RawPromo } from "../scrapers/types";

// Cliente lazy: se crea la primera vez que se usa, cuando dotenv ya cargó las vars
// Se tipifica como `any` en la capa de datos porque no generamos tipos desde Supabase.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _supabase: ReturnType<typeof createClient<any>> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSupabase(): ReturnType<typeof createClient<any>> {
  if (!_supabase) {
    _supabase = createClient<any>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
}

export async function savePromos(promos: RawPromo[]): Promise<void> {
  if (promos.length === 0) throw new Error("El scraper no encontró promociones; se conservan los datos anteriores.");

  // Deduplicar por sourceUrl (incluye el ID único de la promo)
  // Esto permite que el mismo banco tenga promos con igual título pero diferente ID
  const seen = new Map<string, RawPromo>();
  for (const p of promos) {
    if (!p.title.trim() || !p.sourceUrl) throw new Error("Promoción sin título o URL fuente.");
    const key = `${p.bankId}::${p.sourceUrl}`;
    if (!seen.has(key)) seen.set(key, p);
  }
  const unique = Array.from(seen.values());

  if (process.env.SCRAPER_DRY_RUN === "true") {
    console.log(`[dry-run] ${unique.length} promociones extraídas; no se escribe en Supabase`);
    return;
  }

  // Identificar obsoletas antes de guardar, sin borrar datos si falla el upsert.
  const bankIds = [...new Set(unique.map((p) => p.bankId))];
  const { data: previous, error: readError } = await getSupabase()
    .from("promos").select("id,bank_id,source_url").in("bank_id", bankIds);
  if (readError) throw new Error(`Error consultando promos anteriores: ${readError.message}`);
  const obsoleteIds = (previous ?? [])
    .filter((p) => !seen.has(`${p.bank_id}::${p.source_url}`))
    .map((p) => p.id);

  const { error } = await getSupabase().from("promos").upsert(
    unique.map((p) => ({
      bank_id: p.bankId,
      title: p.title,
      description: p.description,
      category_id: p.categoryId,
      discount_value: p.discountValue,
      discount_type: p.discountType,
      expires_at: p.expiresAt,
      image_url: p.imageUrl,
      source_url: p.sourceUrl,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "bank_id,source_url", defaultToNull: false }
  );

  if (error) throw new Error(`Error guardando promos: ${error.message}`);
  // El upsert conserva los IDs y la moderación is_active de las promos existentes.
  if (obsoleteIds.length > 0) {
    const { error: cleanupError } = await getSupabase().from("promos")
      .delete().in("id", obsoleteIds);
    if (cleanupError) throw new Error(`Promos guardadas, pero falló la limpieza: ${cleanupError.message}`);
  }
}

interface ScraperRunPayload {
  bankId: BankId;
  status: ScraperStatus;
  promosFound: number;
  errorType: ScraperErrorType | null;
  errorMessage: string | null;
  startedAt: string;
}

export async function logScraperRun(payload: ScraperRunPayload): Promise<void> {
  if (process.env.SCRAPER_DRY_RUN === "true") return;
  const { error } = await getSupabase().from("scraper_runs").insert({
    bank_id: payload.bankId,
    status: payload.status,
    promos_found: payload.promosFound,
    error_type: payload.errorType,
    error_message: payload.errorMessage,
    started_at: payload.startedAt,
    finished_at: new Date().toISOString(),
  });

  if (error) console.error("Error registrando scraper run:", error.message);
}
