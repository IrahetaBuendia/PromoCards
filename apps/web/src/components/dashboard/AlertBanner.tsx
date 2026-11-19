"use client";

import { useState } from "react";
import { BANK_NAMES, CATEGORY_ICONS, daysToPromoExpiry } from "@promocards/types";
import type { Promo, CategoryId } from "@promocards/types";

// Categorías prioritarias para alertas
const PRIORITY_CATEGORIES: CategoryId[] = ["gasolina", "supermercados", "farmacias"];



interface Props {
  promos: Promo[];
}

export function AlertBanner({ promos }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const alerts = promos.filter((p) => {
    if (!p.expiresAt) return false;
    if (!PRIORITY_CATEGORIES.includes(p.categoryId)) return false;
    if (dismissed.has(p.id)) return false;
    const days = daysToPromoExpiry(p.expiresAt);
    return days >= 0 && days <= 7;
  }).sort((a, b) => {
    const daysA = daysToPromoExpiry(a.expiresAt!);
    const daysB = daysToPromoExpiry(b.expiresAt!);
    return daysA - daysB;
  });

  if (alerts.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🔔</span>
        <p className="text-sm font-bold text-amber-800">
          {alerts.length} {alerts.length === 1 ? "promoción prioritaria vence" : "promociones prioritarias vencen"} pronto
        </p>
      </div>

      {alerts.map((promo) => {
        const days = daysToPromoExpiry(promo.expiresAt!);
        const icon = CATEGORY_ICONS[promo.categoryId];
        const bankName = BANK_NAMES[promo.bankId] ?? promo.bankId;
        const urgency = days <= 1 ? "text-red-700 bg-red-100" : days <= 3 ? "text-orange-700 bg-orange-100" : "text-amber-700 bg-amber-100";

        return (
          <div key={promo.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-amber-100">
            <span className="text-xl shrink-0">{icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{promo.title}</p>
              <p className="text-xs text-gray-500">{bankName}</p>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${urgency}`}>
              {days === 0 ? "¡Hoy!" : days === 1 ? "¡Mañana!" : `${days} días`}
            </span>
            <button
              onClick={() => setDismissed((prev) => new Set([...prev, promo.id]))}
              className="text-gray-300 hover:text-gray-500 text-lg leading-none shrink-0"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
