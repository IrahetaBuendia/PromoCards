"use client";

import { useState, Suspense } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { CategoryFilter } from "./CategoryFilter";
import { BankFilter } from "./BankFilter";
import { TodayFilter } from "./TodayFilter";

function AccordionSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-gray-100 first:border-t-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</span>
        {open
          ? <ChevronDown size={13} strokeWidth={2.5} className="text-gray-400" />
          : <ChevronRight size={13} strokeWidth={2.5} className="text-gray-400" />
        }
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

export function FilterSidebar() {
  const [open, setOpen] = useState(true);

  return (
    <div className="relative shrink-0 self-start sticky top-20">
      {open ? (
        <aside className="w-52 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
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

          <div className="overflow-y-auto max-h-[calc(100vh-8rem)]">
            <AccordionSection title="Categoría" defaultOpen>
              <Suspense><CategoryFilter vertical /></Suspense>
            </AccordionSection>

            <AccordionSection title="Banco" defaultOpen>
              <Suspense><BankFilter vertical /></Suspense>
            </AccordionSection>

            <AccordionSection title="Fecha" defaultOpen>
              <Suspense><TodayFilter /></Suspense>
            </AccordionSection>
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
