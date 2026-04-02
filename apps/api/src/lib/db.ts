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
  if (promos.length === 0) return;

  // Deduplicar por (bank_id, source_url) antes del upsert
  const seen = new Map<string, RawPromo>();
  for (const p of promos) {
    const key = `${p.bankId}::${p.sourceUrl}`;
    if (!seen.has(key)) seen.set(key, p);
  }
  const unique = Array.from(seen.values());

  // Obtener los bankIds únicos de este batch
  const bankIds = [...new Set(unique.map((p) => p.bankId))];

  // Paso 1: eliminar TODAS las promos anteriores del banco.
  // Cada scrape es la fuente de verdad — lo que no aparece hoy, no existe.
  for (const bankId of bankIds) {
    const { error: deleteError } = await getSupabase()
      .from("promos")
      .delete()
      .eq("bank_id", bankId);
    if (deleteError) {
      console.warn(`[db] No se pudo eliminar promos de ${bankId}: ${deleteError.message}`);
    }
  }

  // Paso 2: insertar las promos frescas del scrape
  const { error } = await getSupabase().from("promos").insert(
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
    }))
  );

  if (error) throw new Error(`Error guardando promos: ${error.message}`);
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
