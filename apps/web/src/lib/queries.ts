/**
 * Funciones de consulta a Supabase — usadas tanto por Server Components
 * como por Route Handlers. Solo corren en el servidor.
 */
import { CATEGORY_ORDER } from "@promocards/types";
import type { CategoryId, BankId } from "@promocards/types";
import { getServiceClient } from "./supabase/service";
import type { AdminPromo, ScraperRun } from "./admin-api";
import type { Promo, DashboardMetrics } from "@promocards/types";

// ─── Dashboard público ────────────────────────────────────────────────────────

export async function getPromos(filters?: {
  categoryId?: CategoryId;
  bankId?: BankId;
}): Promise<Promo[]> {
  const db = getServiceClient();

  let query = db
    .from("promos")
    .select("*")
    .eq("is_active", true)
    .order("expires_at", { ascending: true });

  if (filters?.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters?.bankId) query = query.eq("bank_id", filters.bankId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  // Ordenar por el orden fijo de categorías
  return (data ?? []).sort(
    (a, b) =>
      (CATEGORY_ORDER[a.category_id as CategoryId] ?? 99) -
      (CATEGORY_ORDER[b.category_id as CategoryId] ?? 99)
  ) as Promo[];
}

export async function getMetrics(): Promise<DashboardMetrics> {
  const db = getServiceClient();
  const oneWeekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [{ count: total }, { data: bestDiscount }, { count: expiringThisWeek }] =
    await Promise.all([
      db.from("promos").select("*", { count: "exact", head: true }).eq("is_active", true),
      db
        .from("promos")
        .select("discount_value")
        .eq("is_active", true)
        .eq("discount_type", "percentage")
        .order("discount_value", { ascending: false })
        .limit(1),
      db
        .from("promos")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true)
        .lte("expires_at", oneWeekFromNow.toISOString()),
    ]);

  return {
    totalActivePromos: total ?? 0,
    bestDiscountToday: bestDiscount?.[0]?.discount_value ?? null,
    expiringThisWeek: expiringThisWeek ?? 0,
  };
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function getScraperRunsFromDB(): Promise<ScraperRun[]> {
  const { data, error } = await getServiceClient()
    .from("scraper_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return (data ?? []) as ScraperRun[];
}

export async function getAdminPromosFromDB(bankId?: BankId): Promise<AdminPromo[]> {
  let query = getServiceClient()
    .from("promos")
    .select("*")
    .order("updated_at", { ascending: false });

  if (bankId) query = query.eq("bank_id", bankId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminPromo[];
}

export async function moderatePromoDB(
  id: string,
  updates: {
    category_id?: string;
    title?: string;
    description?: string | null;
    is_active?: boolean;
  }
): Promise<AdminPromo> {
  const { data, error } = await getServiceClient()
    .from("promos")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as AdminPromo;
}
