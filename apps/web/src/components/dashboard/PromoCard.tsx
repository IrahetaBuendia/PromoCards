import { Fuel, ShoppingCart, Pill, UtensilsCrossed, Store, Wrench, Tv, Package } from "lucide-react";
import type { Promo, BankId, CategoryId } from "@promocards/types";

const BANK_CONFIG: Record<BankId, { name: string; color: string; headerText: string; badgeBg: string; badgeText: string }> = {
  "fedecredito":      { name: "Fedecrédito",     color: "#31825b", headerText: "#ffffff", badgeBg: "#dcfce7", badgeText: "#14532d" },
  "banco-industrial": { name: "Banco Industrial", color: "#023866", headerText: "#ffffff", badgeBg: "#dbeafe", badgeText: "#023866" },
  "credicomer":       { name: "Credicomer",       color: "#14b8a6", headerText: "#ffffff", badgeBg: "#ccfbf1", badgeText: "#0f766e" },
  "bac-credomatic":   { name: "BAC Credomatic",   color: "#dc2626", headerText: "#ffffff", badgeBg: "#fee2e2", badgeText: "#991b1b" },
  "credisiman":       { name: "Credisiman",       color: "#0002b8", headerText: "#ffffff", badgeBg: "#e0e7ff", badgeText: "#0002b8" },
  "banco-agricola":   { name: "Banco Agrícola",   color: "#facc00", headerText: "#713f12", badgeBg: "#fef9c3", badgeText: "#713f12" },
};

type CategoryIconComponent = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }>;

const CATEGORY_ICON_COMPONENTS: Record<CategoryId, CategoryIconComponent> = {
  gasolina:           Fuel,
  supermercados:      ShoppingCart,
  farmacias:          Pill,
  restaurantes:       UtensilsCrossed,
  almacenes:          Store,
  "repuestos-talleres": Wrench,
  streaming:          Tv,
  otros:              Package,
};

const CATEGORY_LABELS: Record<CategoryId, string> = {
  gasolina:           "Gasolina",
  supermercados:      "Supermercados",
  farmacias:          "Farmacias",
  restaurantes:       "Restaurantes",
  almacenes:          "Almacenes",
  "repuestos-talleres": "Repuestos y Talleres",
  streaming:          "Streaming",
  otros:              "Otros",
};

// Fondo e ícono coloridos para el placeholder cuando no hay imagen
const CATEGORY_PLACEHOLDER: Record<CategoryId, { bg: string; iconColor: string }> = {
  gasolina:           { bg: "#fff7ed", iconColor: "#ea580c" },
  supermercados:      { bg: "#f0fdf4", iconColor: "#16a34a" },
  farmacias:          { bg: "#eff6ff", iconColor: "#2563eb" },
  restaurantes:       { bg: "#fff1f2", iconColor: "#e11d48" },
  almacenes:          { bg: "#fdf4ff", iconColor: "#a21caf" },
  "repuestos-talleres": { bg: "#fefce8", iconColor: "#ca8a04" },
  streaming:          { bg: "#faf5ff", iconColor: "#9333ea" },
  otros:              { bg: "#f1f5f9", iconColor: "#64748b" },
};

interface Props {
  promo: Promo;
}

export function PromoCard({ promo }: Props) {
  const bank = BANK_CONFIG[promo.bankId];
  const CategoryIcon = CATEGORY_ICON_COMPONENTS[promo.categoryId] ?? Package;
  const categoryLabel = CATEGORY_LABELS[promo.categoryId] ?? "Otros";
  const placeholder = CATEGORY_PLACEHOLDER[promo.categoryId] ?? CATEGORY_PLACEHOLDER.otros;
  const bankColor = bank?.color ?? "#9ca3af";
  const bankHeaderText = bank?.headerText ?? "#ffffff";

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
        <span style={{ color: bankHeaderText }} className="text-xs font-extrabold tracking-wide uppercase truncate">
          {bank?.name ?? promo.bankId}
        </span>
        {promo.discountValue && (
          <span style={{ color: bankHeaderText }} className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-black/10 border border-black/10 shrink-0">
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
        <div className="h-36 flex items-center justify-center" style={{ backgroundColor: placeholder.bg }}>
          <CategoryIcon size={52} strokeWidth={1.25} style={{ color: placeholder.iconColor }} />
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
