import { Fuel, ShoppingCart, Pill, UtensilsCrossed, Tv, Package } from "lucide-react";
import type { Promo, BankId, CategoryId } from "@promocards/types";

const BANK_CONFIG: Record<BankId, { name: string; color: string; badgeBg: string; badgeText: string }> = {
  "fedecredito":      { name: "Fedecrédito",     color: "#3b82f6", badgeBg: "#dbeafe", badgeText: "#1e40af" },
  "banco-industrial": { name: "Banco Industrial", color: "#dc2626", badgeBg: "#fee2e2", badgeText: "#991b1b" },
  "credicomer":       { name: "Credicomer",       color: "#f97316", badgeBg: "#ffedd5", badgeText: "#9a3412" },
  "bac-credomatic":   { name: "BAC Credomatic",   color: "#16a34a", badgeBg: "#dcfce7", badgeText: "#14532d" },
  "credisiman":       { name: "Credisiman",       color: "#9333ea", badgeBg: "#f3e8ff", badgeText: "#581c87" },
  "banco-agricola":   { name: "Banco Agrícola",   color: "#0d9488", badgeBg: "#ccfbf1", badgeText: "#134e4a" },
};

type CategoryIconComponent = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

const CATEGORY_ICON_COMPONENTS: Record<CategoryId, CategoryIconComponent> = {
  gasolina:      Fuel,
  supermercados: ShoppingCart,
  farmacias:     Pill,
  restaurantes:  UtensilsCrossed,
  streaming:     Tv,
  otros:         Package,
};

const CATEGORY_LABELS: Record<CategoryId, string> = {
  gasolina:      "Gasolina",
  supermercados: "Supermercados",
  farmacias:     "Farmacias",
  restaurantes:  "Restaurantes",
  streaming:     "Streaming",
  otros:         "Otros",
};

interface Props {
  promo: Promo;
}

export function PromoCard({ promo }: Props) {
  const bank = BANK_CONFIG[promo.bankId];
  const CategoryIcon = CATEGORY_ICON_COMPONENTS[promo.categoryId] ?? Package;
  const categoryLabel = CATEGORY_LABELS[promo.categoryId] ?? "Otros";
  const bankColor = bank?.color ?? "#9ca3af";

  const expiresDate = promo.expiresAt
    ? new Date(promo.expiresAt).toLocaleDateString("es-SV", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const isExpiringSoon = promo.expiresAt
    ? new Date(promo.expiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000
    : false;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">

      {/* Cabecera banco — color sólido con nombre */}
      <div style={{ backgroundColor: bankColor }} className="px-3 py-2 flex items-center justify-between gap-2">
        <span className="text-white text-xs font-extrabold tracking-wide uppercase truncate">
          {bank?.name ?? promo.bankId}
        </span>
        {promo.discountValue && (
          <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-white/25 text-white border border-white/40 shrink-0">
            {promo.discountValue}
          </span>
        )}
      </div>

      {/* Imagen */}
      {promo.imageUrl ? (
        <div className="h-36 overflow-hidden bg-gray-100">
          <img
            src={promo.imageUrl}
            alt={promo.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="h-36 flex items-center justify-center bg-gray-50">
          <CategoryIcon size={48} strokeWidth={1} className="text-gray-300" />
        </div>
      )}

      {/* Contenido */}
      <div className="p-3 flex flex-col flex-1 gap-2">
        <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-3 flex-1">
          {promo.title}
        </h3>

        {/* Footer: categoría izq · banco der */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-50 gap-1">
          <span className="flex items-center gap-1 text-xs text-gray-400 font-medium shrink-0">
            <CategoryIcon size={13} strokeWidth={2} />
            {categoryLabel}
          </span>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
            style={{ backgroundColor: bank?.badgeBg ?? "#f3f4f6", color: bank?.badgeText ?? "#374151" }}
          >
            {bank?.name ?? promo.bankId}
          </span>
        </div>

        {/* Vencimiento si aplica */}
        {expiresDate && (
          <div className="flex justify-end">
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={isExpiringSoon
                ? { backgroundColor: "#fee2e2", color: "#dc2626" }
                : { backgroundColor: "#f3f4f6", color: "#6b7280" }}
            >
              {isExpiringSoon ? "⚠️ " : ""}Vence {expiresDate}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
