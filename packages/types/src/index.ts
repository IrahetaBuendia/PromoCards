// ─── Bancos ───────────────────────────────────────────────────────────────────

export type BankId =
  | "fedecredito"
  | "banco-industrial"
  | "credicomer"
  | "bac-credomatic"
  | "credisiman"
  | "banco-agricola"
  | "banco-cuscatlan";

export const BANK_NAMES: Record<BankId, string> = {
  fedecredito: "Fedecrédito",
  "banco-industrial": "Banco Industrial",
  credicomer: "Credicomer",
  "bac-credomatic": "BAC Credomatic",
  credisiman: "Credisiman",
  "banco-agricola": "Banco Agrícola",
  "banco-cuscatlan": "Banco Cuscatlán",
};

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
  | "almacenes"
  | "repuestos-talleres"
  | "ferreterias"
  | "streaming"
  | "belleza"
  | "salud"
  | "regalos"
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
  belleza: 9,
  salud: 10,
  regalos: 11,
  otros: 12,
};

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  gasolina: "Gasolina",
  supermercados: "Supermercados",
  farmacias: "Farmacias",
  restaurantes: "Restaurantes",
  almacenes: "Almacenes",
  "repuestos-talleres": "Repuestos y talleres",
  ferreterias: "Ferreterías",
  streaming: "Streaming",
  belleza: "Belleza",
  salud: "Salud",
  regalos: "Regalos",
  otros: "Otros",
};

export const CATEGORY_ICONS: Record<CategoryId, string> = {
  gasolina: "⛽", supermercados: "🛒", farmacias: "💊", restaurantes: "🍽️",
  almacenes: "🏬", "repuestos-talleres": "🔧", ferreterias: "🔨", streaming: "📺",
  belleza: "💅", salud: "🩺", regalos: "🎁", otros: "🏷️",
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
  details?: PromoDetails;
}

export interface PromoDetails {
  merchantName?: string;
  startsAt?: string;
  permanent?: boolean;
  weekdays?: number[];
  excludedWeekdays?: number[];
  eligibleCards?: string;
  cardTypes?: CardType[];
  requiresCoupon?: boolean;
  requiresReport?: boolean;
  conditions?: string;
  redeemFrom?: string;
  redeemUntil?: string;
}

export type CardType = "credit" | "debit";
export type CardPreferences = Partial<Record<BankId, CardType>>;

export { getPromoDetails, isPromoValidToday, getDayInElSalvador, formatPromoDate, daysToPromoExpiry, promoTerms, inferExtraCategory, matchesMyCards } from "./promo-details";

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

export function isPromoCardsAdmin(user: { id: string; app_metadata?: Record<string, unknown> }, allowedIds = ""): boolean {
  return user.app_metadata?.role === "admin" || (Boolean(user.id) && allowedIds.split(",").some((id) => id.trim() === user.id));
}

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
