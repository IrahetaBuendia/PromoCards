"use client";

import { useState } from "react";
import type { Promo } from "@promocards/types";
import { PromoCard } from "./PromoCard";
import { PromoModal } from "./PromoModal";

interface Props {
  promos: Promo[];
  hasSearch: boolean;
}

export function PromoGrid({ promos, hasSearch }: Props) {
  const [selected, setSelected] = useState<Promo | null>(null);

  if (promos.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <div className="text-5xl mb-4">🔍</div>
        <p className="text-lg font-medium">
          {hasSearch ? "No encontramos promociones para esta búsqueda" : "No hay promociones con estos filtros"}
        </p>
        <p className="text-sm mt-1">
          {hasSearch ? "Prueba con otro nombre o cambia los filtros." : "Prueba cambiando los filtros."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
        {promos.map((promo) => (
          <button
            key={promo.id}
            onClick={() => setSelected(promo)}
            className="text-left w-full focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-2xl"
          >
            <PromoCard promo={promo} />
          </button>
        ))}
      </div>

      {selected && (
        <PromoModal promo={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
