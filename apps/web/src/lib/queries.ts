/**
 * Funciones de consulta a Supabase — usadas tanto por Server Components
 * como por Route Handlers. Solo corren en el servidor.
 */
import { CATEGORY_ORDER, getPromoDetails, inferExtraCategory, isPromoValidToday } from "@promocards/types";
import type { CategoryId, BankId } from "@promocards/types";
import { getServiceClient } from "./supabase/service";
import type { AdminPromo, ScraperRun, ScraperTrigger } from "./admin-api";
import type { Promo, DashboardMetrics } from "@promocards/types";
import { searchPromos } from "./promo-search";

// ─── Dashboard público ────────────────────────────────────────────────────────

export interface PromoFilters {
  categoryId?: CategoryId;
  bankId?: BankId;
  search?: string;
  today?: boolean;
  sort?: "expiry" | "relevance";
}

function activePromosQuery() {
  return getServiceClient()
    .from("promos")
    .select("*")
    .eq("is_active", true)
    .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
    .order("expires_at", { ascending: true });
}

function mapPromo(row: Record<string, any>): Promo {
  const category = row.category_id === "otros"
    ? inferExtraCategory(`${row.title} ${row.description ?? ""}`) ?? "otros"
    : row.category_id;
  const promo: Promo = {
    id: row.id,
    bankId: row.bank_id,
    title: row.title,
    description: row.description,
    categoryId: category,
    discountType: row.discount_type,
    discountValue: row.discount_value,
    expiresAt: row.expires_at,
    imageUrl: row.image_url,
    sourceUrl: row.source_url,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    details: row.promo_details ?? undefined,
  };
  return { ...promo, details: getPromoDetails(promo) };
}

export async function getPromo(id: string): Promise<Promo | null> {
  if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id)) return null;
  const { data, error } = await activePromosQuery().eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapPromo(data) : null;
}

export async function getPromos(filters?: PromoFilters): Promise<Promo[]> {
  let query = activePromosQuery();

  const category = filters?.categoryId;
  if (category === "belleza" || category === "salud" || category === "regalos") {
    query = query.in("category_id", [category, "otros"]);
  } else if (category) {
    query = query.eq("category_id", category);
  }
  if (filters?.bankId) query = query.eq("bank_id", filters.bankId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let promos = (data ?? []).map(mapPromo);
  if (category) promos = promos.filter((promo) => promo.categoryId === category);
  if (filters?.today) promos = promos.filter((promo) => isPromoValidToday(promo));
  if (filters?.sort !== "expiry") {
    promos.sort((a, b) => (CATEGORY_ORDER[a.categoryId] ?? 99) - (CATEGORY_ORDER[b.categoryId] ?? 99));
  }
  if (filters?.search) promos = searchPromos(promos, filters.search);
  if (filters?.sort === "expiry") {
    const expiry = (promo: Promo) => promo.expiresAt ? Date.parse(promo.expiresAt) : Infinity;
    promos.sort((a, b) => expiry(a) - expiry(b));
  }
  return promos;
}

export async function getBankUpdates(): Promise<Partial<Record<BankId, string>>> {
  const { data, error } = await getServiceClient().from("scraper_runs")
    .select("bank_id,started_at,finished_at")
    .eq("status", "success")
    .order("started_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  const updates: Partial<Record<BankId, string>> = {};
  for (const row of data ?? []) updates[row.bank_id as BankId] ??= row.finished_at ?? row.started_at;
  return updates;
}

export async function getMetrics(): Promise<DashboardMetrics> {
  const promos = await getPromos();
  const oneWeekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const percentages = promos.filter((p) => p.discountType === "percentage" && Number.isFinite(parseFloat(p.discountValue)))
    .sort((a, b) => parseFloat(b.discountValue) - parseFloat(a.discountValue));

  return {
    totalActivePromos: promos.length,
    bestDiscountToday: percentages[0]?.discountValue ?? null,
    expiringThisWeek: promos.filter((p) => p.expiresAt && new Date(p.expiresAt) <= oneWeekFromNow).length,
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

export async function logScraperTrigger(trigger: {
  userId: string;
  userEmail: string;
  userName: string | null;
  bankId: string | null;
}): Promise<void> {
  const { error } = await getServiceClient()
    .from("scraper_triggers")
    .insert({
      user_id: trigger.userId,
      user_email: trigger.userEmail,
      user_name: trigger.userName,
      bank_id: trigger.bankId,
    });

  if (error) console.error("Error registrando scraper trigger:", error.message);
}

export async function getScraperTriggersFromDB(): Promise<ScraperTrigger[]> {
  const { data, error } = await getServiceClient()
    .from("scraper_triggers")
    .select("*")
    .order("triggered_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return (data ?? []) as ScraperTrigger[];
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
