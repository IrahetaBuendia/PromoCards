"use client";

import { useState } from "react";
import { CategoryFilter } from "./CategoryFilter";
import { BankFilter } from "./BankFilter";
import { TodayFilter } from "./TodayFilter";
import { Suspense } from "react";

export function FilterSidebar() {
  const [open, setOpen] = useState(true);

  return (
    <>
      {/* Botón toggle siempre visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors border border-gray-200 bg-white shadow-sm whitespace-nowrap"
        title={open ? "Ocultar filtros" : "Mostrar filtros"}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M11 12h2" />
        </svg>
        {open ? "Ocultar filtros" : "Filtros"}
      </button>

      {/* Sidebar */}
      {open && (
        <aside className="w-56 shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-5 self-start sticky top-20">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Categoría</p>
            <Suspense>
              <CategoryFilter vertical />
            </Suspense>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Banco</p>
            <Suspense>
              <BankFilter vertical />
            </Suspense>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Fecha</p>
            <Suspense>
              <TodayFilter />
            </Suspense>
          </div>
        </aside>
      )}
    </>
  );
}
