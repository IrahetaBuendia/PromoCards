/**
 * Helpers para obtener datos desde Server Components.
 * Llaman directamente a Supabase vía queries.ts — sin fetch intermedio.
 */
import { getPromos as getPromosQuery, getMetrics as getMetricsQuery, type PromoFilters } from "./queries";
import type { Promo, DashboardMetrics } from "@promocards/types";

export async function getPromos(filters?: PromoFilters): Promise<Promo[]> {
  try {
    return await getPromosQuery(filters);
  } catch {
    return [];
  }
}

export async function getMetrics(): Promise<DashboardMetrics> {
  try {
    return await getMetricsQuery();
  } catch {
    return { totalActivePromos: 0, bestDiscountToday: null, expiringThisWeek: 0 };
  }
}
