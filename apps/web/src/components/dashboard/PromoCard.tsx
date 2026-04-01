import type { Promo, BankId, CategoryId } from "@promocards/types";

const BANK_CONFIG: Record<BankId, { name: string; color: string; border: string; badge: string }> = {
  "fedecredito":      { name: "Fedecrédito",     color: "bg-blue-500",   border: "border-l-blue-500",   badge: "bg-blue-100 text-blue-800" },
  "banco-industrial": { name: "Banco Industrial", color: "bg-red-600",    border: "border-l-red-600",    badge: "bg-red-100 text-red-800" },
  "credicomer":       { name: "Credicomer",       color: "bg-orange-500", border: "border-l-orange-500", badge: "bg-orange-100 text-orange-800" },
  "bac-credomatic":   { name: "BAC Credomatic",   color: "bg-green-600",  border: "border-l-green-600",  badge: "bg-green-100 text-green-800" },
  "credisiman":       { name: "Credisiman",       color: "bg-purple-600", border: "border-l-purple-600", badge: "bg-purple-100 text-purple-800" },
  "banco-agricola":   { name: "Banco Agrícola",   color: "bg-teal-600",   border: "border-l-teal-600",   badge: "bg-teal-100 text-teal-800" },
};

const CATEGORY_ICONS: Record<CategoryId, string> = {
  gasolina:      "⛽",
  supermercados: "🛒",
  farmacias:     "💊",
  restaurantes:  "🍽️",
  streaming:     "🎬",
  otros:         "📦",
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
  const categoryIcon = CATEGORY_ICONS[promo.categoryId] ?? "📦";
  const categoryLabel = CATEGORY_LABELS[promo.categoryId] ?? "Otros";

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
    <div className={`bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5`}>

      {/* Cabecera del banco — franja de color con nombre */}
      <div className={`${bank?.color ?? "bg-gray-400"} px-4 py-2 flex items-center justify-between`}>
        <span className="text-white text-xs font-extrabold tracking-wide uppercase">
          {bank?.name ?? promo.bankId}
        </span>
        {promo.discountValue && (
          <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
            {promo.discountValue}
          </span>
        )}
      </div>

      {/* Imagen */}
      {promo.imageUrl ? (
        <div className="h-40 overflow-hidden bg-gray-100">
          <img
            src={promo.imageUrl}
            alt={promo.title}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="h-40 flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, #f8f9fa, #e9ecef)` }}>
          <span className="text-5xl opacity-40">{categoryIcon}</span>
        </div>
      )}

      {/* Contenido */}
      <div className="p-4 flex flex-col flex-1 gap-2">

        {/* Título */}
        <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-3 flex-1">
          {promo.title}
        </h3>

        {/* Footer: categoría + vencimiento */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <span className="text-xs text-gray-400 font-medium">
            {categoryIcon} {categoryLabel}
          </span>
          {expiresDate ? (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
              ${isExpiringSoon ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"}`}>
              {isExpiringSoon ? "⚠️ " : ""}Vence {expiresDate}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
