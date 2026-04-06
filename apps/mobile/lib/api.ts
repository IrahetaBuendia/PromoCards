import type { Promo, DashboardMetrics, CategoryId, BankId } from "@promocards/types";
import { API_BASE_URL } from "./constants";

export async function fetchPromos(filters?: {
  categoryId?: CategoryId;
  bankId?: BankId;
}): Promise<Promo[]> {
  const params = new URLSearchParams();
  if (filters?.categoryId) params.set("category", filters.categoryId);
  if (filters?.bankId) params.set("bank", filters.bankId);

  const query = params.toString();
  const url = `${API_BASE_URL}/api/promos${query ? `?${query}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error al obtener promos: ${res.status}`);
  return res.json();
}

export async function fetchMetrics(): Promise<DashboardMetrics> {
  const res = await fetch(`${API_BASE_URL}/api/promos/metrics`);
  if (!res.ok) throw new Error(`Error al obtener métricas: ${res.status}`);
  return res.json();
}
