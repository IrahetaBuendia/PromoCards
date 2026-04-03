"use client";

import { useState } from "react";
import { moderatePromo } from "@/lib/admin-api";
import type { AdminPromo } from "@/lib/admin-api";
import type { CategoryId } from "@promocards/types";

const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: "gasolina", label: "⛽ Gasolina" },
  { id: "supermercados", label: "🛒 Supermercados" },
  { id: "farmacias", label: "💊 Farmacias" },
  { id: "restaurantes", label: "🍽️ Restaurantes" },
  { id: "almacenes", label: "🏪 Almacenes" },
  { id: "repuestos-talleres", label: "🔧 Repuestos y Talleres" },
  { id: "ferreterias", label: "🔨 Ferreterías" },
  { id: "streaming", label: "🎬 Streaming" },
  { id: "otros", label: "📦 Otros" },
];

interface Props {
  promo: AdminPromo;
  onClose: () => void;
  onSaved: (updated: AdminPromo) => void;
}

export function EditPromoModal({ promo, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(promo.title);
  const [description, setDescription] = useState(promo.description ?? "");
  const [categoryId, setCategoryId] = useState<CategoryId>(promo.category_id);
  const [isActive, setIsActive] = useState(promo.is_active);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await moderatePromo(promo.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        categoryId,
        isActive,
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-extrabold text-gray-900">Editar promoción</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl font-bold leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Título</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400 focus:bg-white focus:ring-2 focus:ring-gray-900/10 transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400 focus:bg-white focus:ring-2 focus:ring-gray-900/10 transition resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Categoría</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                    categoryId === cat.id
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <span className="text-sm font-semibold text-gray-700">Promoción activa</span>
            <button
              type="button"
              onClick={() => setIsActive((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? "bg-emerald-500" : "bg-gray-300"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button onClick={onClose} className="text-sm font-semibold text-gray-500 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-sm font-bold bg-gray-900 text-white px-5 py-2 rounded-xl hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
