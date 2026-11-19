import type { Promo, DashboardMetrics, CategoryId, BankId } from "./types";
import { API_BASE_URL } from "./constants";

export async function fetchPromos(filters?: {
  categoryId?: CategoryId;
  bankId?: BankId;
  search?: string;
  today?: boolean;
  sort?: "relevance" | "expiry";
}): Promise<Promo[]> {
  const params = new URLSearchParams();
  if (filters?.categoryId) params.set("category", filters.categoryId);
  if (filters?.bankId) params.set("bank", filters.bankId);
  if (filters?.search) params.set("q", filters.search);
  if (filters?.today) params.set("today", "1");
  if (filters?.sort === "expiry") params.set("sort", "expiry");

  const query = params.toString();
  const url = `${API_BASE_URL}/api/promos${query ? `?${query}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error al obtener promos: ${res.status}`);
  return res.json();
}

export async function fetchPromo(id: string): Promise<Promo | null> {
  const res = await fetch(`${API_BASE_URL}/api/promos/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Error al obtener promoción: ${res.status}`);
  return res.json();
}

export async function fetchMetrics(): Promise<DashboardMetrics> {
  const res = await fetch(`${API_BASE_URL}/api/promos/metrics`);
  if (!res.ok) throw new Error(`Error al obtener métricas: ${res.status}`);
  return res.json();
}

export async function fetchBankUpdates(): Promise<Partial<Record<BankId, string>>> {
  const res = await fetch(`${API_BASE_URL}/api/promos/updates`);
  if (!res.ok) throw new Error(`Error al obtener actualizaciones: ${res.status}`);
  return res.json();
}
