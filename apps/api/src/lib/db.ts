import { createClient } from "@supabase/supabase-js";
import type { BankId, ScraperErrorType, ScraperStatus } from "@promocards/types";
import type { RawPromo } from "../scrapers/types";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function savePromos(promos: RawPromo[]): Promise<void> {
  if (promos.length === 0) return;

  const { error } = await supabase.from("promos").upsert(
    promos.map((p) => ({
      bank_id: p.bankId,
      title: p.title,
      description: p.description,
      category_id: p.categoryId,
      discount_value: p.discountValue,
      discount_type: p.discountType,
      expires_at: p.expiresAt,
      image_url: p.imageUrl,
      source_url: p.sourceUrl,
      is_active: true,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "bank_id,source_url" }
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
  const { error } = await supabase.from("scraper_runs").insert({
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
