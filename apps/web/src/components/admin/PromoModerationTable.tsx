"use client";

import { useState } from "react";
import { EditPromoModal } from "./EditPromoModal";
import type { AdminPromo } from "@/lib/admin-api";
import type { BankId, CategoryId } from "@promocards/types";

const BANK_NAMES: Record<BankId, string> = {
  fedecredito: "Fedecrédito",
  "banco-industrial": "Banco Industrial",
  credicomer: "Credicomer",
  "bac-credomatic": "BAC Credomatic",
  credisiman: "Credisiman",
  "banco-agricola": "Banco Agrícola",
};

const CATEGORY_LABELS: Record<CategoryId, string> = {
  gasolina:             "⛽ Gasolina",
  supermercados:        "🛒 Supermercados",
  farmacias:            "💊 Farmacias",
  restaurantes:         "🍽️ Restaurantes",
  almacenes:            "🏬 Almacenes",
  "repuestos-talleres": "🔧 Repuestos y Talleres",
  streaming:            "🎬 Streaming",
  otros:                "📦 Otros",
};

const ALL_BANKS: Array<{ value: string; label: string }> = [
  { value: "", label: "Todos los bancos" },
  { value: "fedecredito", label: "Fedecrédito" },
  { value: "banco-industrial", label: "Banco Industrial" },
  { value: "credicomer", label: "Credicomer" },
  { value: "bac-credomatic", label: "BAC Credomatic" },
  { value: "credisiman", label: "Credisiman" },
  { value: "banco-agricola", label: "Banco Agrícola" },
];

const ALL_CATEGORIES: Array<{ value: string; label: string }> = [
  { value: "", label: "Todas las categorías" },
  { value: "gasolina", label: "⛽ Gasolina" },
  { value: "supermercados", label: "🛒 Supermercados" },
  { value: "farmacias", label: "💊 Farmacias" },
  { value: "restaurantes", label: "🍽️ Restaurantes" },
  { value: "almacenes", label: "🏬 Almacenes" },
  { value: "repuestos-talleres", label: "🔧 Repuestos y Talleres" },
  { value: "streaming", label: "🎬 Streaming" },
  { value: "otros", label: "📦 Otros" },
];

interface Props {
  initialPromos: AdminPromo[];
}

export function PromoModerationTable({ initialPromos }: Props) {
  const [promos, setPromos] = useState<AdminPromo[]>(initialPromos);
  const [editing, setEditing] = useState<AdminPromo | null>(null);
  const [filterBank, setFilterBank] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [search, setSearch] = useState("");

  const filtered = promos.filter((p) => {
    if (filterBank && p.bank_id !== filterBank) return false;
    if (filterCategory && p.category_id !== filterCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.title.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  function handleSaved(updated: AdminPromo) {
    setPromos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setEditing(null);
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header + filtros */}
        <div className="px-6 py-4 border-b border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-gray-900">Moderación de promociones</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {filtered.length} de {promos.length} promos
              </p>
            </div>
          </div>
          {/* Filtros */}
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Buscar por título…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm outline-none focus:border-gray-400 focus:bg-white transition w-48"
            />
            <select
              value={filterBank}
              onChange={(e) => setFilterBank(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm outline-none focus:border-gray-400 focus:bg-white transition"
            >
              {ALL_BANKS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm outline-none focus:border-gray-400 focus:bg-white transition"
            >
              {ALL_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Banco
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Título
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Descuento
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm">
                    No hay promociones que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                filtered.map((promo) => (
                  <tr key={promo.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3 text-xs font-semibold text-gray-600 whitespace-nowrap">
                      {BANK_NAMES[promo.bank_id] ?? promo.bank_id}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <span className="font-medium text-gray-900 line-clamp-2">{promo.title}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs font-semibold text-gray-600">
                        {CATEGORY_LABELS[promo.category_id] ?? promo.category_id}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {promo.discount_value ? (
                        <span className="text-xs font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">
                          {promo.discount_value}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de edición */}
      {editing && (
        <EditPromoModal
          promo={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
