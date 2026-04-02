"use client";

import { useState } from "react";
import { CategoryFilter } from "./CategoryFilter";
import { BankFilter } from "./BankFilter";
import { TodayFilter } from "./TodayFilter";
import { Suspense } from "react";

export function FilterSidebar() {
  const [open, setOpen] = useState(true);

  return (
    <div className="relative shrink-0 self-start sticky top-20">
      {open ? (
        <aside className="w-52 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Header del sidebar con botón cerrar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Filtros</span>
            <button
              onClick={() => setOpen(false)}
              className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-700"
              title="Ocultar filtros"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          <div className="p-4 space-y-5">
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
          </div>
        </aside>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex flex-col items-center gap-1.5 w-9 py-3 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all text-gray-400 hover:text-gray-700"
          title="Mostrar filtros"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
            Filtros
          </span>
        </button>
      )}
    </div>
  );
}
