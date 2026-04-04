/**
 * Helpers para llamadas admin desde Client Components.
 * Usan fetch hacia los Route Handlers de Next.js (/api/admin/...).
 * La autenticación va por cookies (misma sesión de Supabase) — no se necesita token.
 */
import type { BankId, CategoryId } from "@promocards/types";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface AdminPromo {
  id: string;
  bank_id: BankId;
  title: string;
  description: string | null;
  category_id: CategoryId;
  discount_type: string;
  discount_value: string;
  expires_at: string | null;
  image_url: string | null;
  source_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScraperRun {
  id: string;
  bank_id: BankId;
  status: "success" | "error" | "running";
  promos_found: number;
  error_type: string | null;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface ScraperTrigger {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  bank_id: string | null;
  triggered_at: string;
}

// ─── Helper fetch (mismo origen — cookies automáticas) ────────────────────────

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  return res.json();
}

// ─── Scraper runs ─────────────────────────────────────────────────────────────

export async function getScraperRuns(): Promise<ScraperRun[]> {
  return apiFetch("/api/admin/scraper-runs");
}

export function getLatestRunsPerBank(
  runs: ScraperRun[]
): Partial<Record<BankId, ScraperRun>> {
  const latest: Partial<Record<BankId, ScraperRun>> = {};
  for (const run of runs) {
    if (!latest[run.bank_id]) latest[run.bank_id] = run;
  }
  return latest;
}

// ─── Promos admin ─────────────────────────────────────────────────────────────

export async function getAdminPromos(): Promise<AdminPromo[]> {
  return apiFetch("/api/admin/promos");
}

export interface ModeratePayload {
  categoryId?: CategoryId;
  title?: string;
  description?: string;
  isActive?: boolean;
}

export async function moderatePromo(
  id: string,
  payload: ModeratePayload
): Promise<AdminPromo> {
  return apiFetch(`/api/admin/promos/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// ─── Scrape manual (dispara GitHub Actions via Route Handler) ─────────────────

export async function triggerScrape(
  bankId?: BankId
): Promise<{ message: string }> {
  return apiFetch("/api/admin/scrape", {
    method: "POST",
    body: JSON.stringify(bankId ? { bankId } : {}),
  });
}
