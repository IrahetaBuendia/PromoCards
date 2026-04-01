/**
 * Helpers para obtener datos desde Server Components.
 * Llaman directamente a Supabase vía queries.ts — sin fetch intermedio.
 */
import { getPromos as getPromosQuery, getMetrics as getMetricsQuery } from "./queries";
import type { Promo, DashboardMetrics, CategoryId, BankId } from "@promocards/types";

export async function getPromos(filters?: {
  categoryId?: CategoryId;
  bankId?: BankId;
}): Promise<Promo[]> {
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
