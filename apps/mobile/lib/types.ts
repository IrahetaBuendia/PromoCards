// ─── Bancos ───────────────────────────────────────────────────────────────────

export type BankId =
  | "fedecredito"
  | "banco-industrial"
  | "credicomer"
  | "bac-credomatic"
  | "credisiman"
  | "banco-agricola"
  | "banco-cuscatlan";

export interface Bank {
  id: BankId;
  name: string;
  url: string;
  active: boolean;
}

// ─── Categorías ───────────────────────────────────────────────────────────────

export type CategoryId =
  | "gasolina"
  | "supermercados"
  | "farmacias"
  | "restaurantes"
  | "almacenes"
  | "repuestos-talleres"
  | "ferreterias"
  | "streaming"
  | "otros";

export const CATEGORY_ORDER: Record<CategoryId, number> = {
  gasolina: 1,
  supermercados: 2,
  farmacias: 3,
  restaurantes: 4,
  almacenes: 5,
  "repuestos-talleres": 6,
  ferreterias: 7,
  streaming: 8,
  otros: 9,
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
  discountValue: string;
  expiresAt: string | null;
  imageUrl: string | null;
  sourceUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
