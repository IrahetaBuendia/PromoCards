// ─── Bancos ───────────────────────────────────────────────────────────────────

export type BankId =
  | "fedecredito"
  | "banco-industrial"
  | "credicomer"
  | "bac-credomatic"
  | "credisiman"
  | "banco-agricola";

export interface Bank {
  id: BankId;
  name: string;
  url: string;
  active: boolean;
}

// ─── Categorías ───────────────────────────────────────────────────────────────

/**
 * Orden fijo de categorías — nunca cambia.
 * El número indica la posición de display (menor = primero).
 */
export type CategoryId =
  | "gasolina"
  | "supermercados"
  | "farmacias"
  | "restaurantes"
  | "streaming"
  | "otros";

export const CATEGORY_ORDER: Record<CategoryId, number> = {
  gasolina: 1,
  supermercados: 2,
  farmacias: 3,
  restaurantes: 4,
  streaming: 5,
  otros: 6,
};

export interface Category {
  id: CategoryId;
  label: string;
}

// ─── Promociones ──────────────────────────────────────────────────────────────

export type DiscountType = "percentage" | "2x1" | "cashback" | "other";

export interface Promo {
  id: string;
  bankId: BankId;
  title: string;
  description: string | null;
  categoryId: CategoryId;
  discountType: DiscountType;
  discountValue: string; // e.g. "30%", "2x1", "5% cashback"
  expiresAt: string | null; // ISO date string
  imageUrl: string | null;
  sourceUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Scraper ──────────────────────────────────────────────────────────────────

export type ScraperStatus = "success" | "error" | "running";

export type ScraperErrorType =
  | "timeout"
  | "ip-blocked"
  | "selector-broken"
  | "unknown";

export interface ScraperRun {
  id: string;
  bankId: BankId;
  status: ScraperStatus;
  promosFound: number;
  errorType: ScraperErrorType | null;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
}

// ─── Usuarios ─────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "editor" | "viewer";

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardMetrics {
  totalActivePromos: number;
  bestDiscountToday: string | null;
  expiringThisWeek: number;
}

export interface PromoFilters {
  categoryId?: CategoryId;
  bankId?: BankId;
}
