"use client";

import { useEffect } from "react";
import type { Promo, BankId, CategoryId } from "@promocards/types";

const BANK_CONFIG: Record<BankId, { name: string; badge: string; accent: string }> = {
  "fedecredito":      { name: "Fedecrédito",     badge: "bg-blue-100 text-blue-800",     accent: "bg-blue-500" },
  "banco-industrial": { name: "Banco Industrial", badge: "bg-red-100 text-red-800",       accent: "bg-red-600" },
  "credicomer":       { name: "Credicomer",       badge: "bg-orange-100 text-orange-800", accent: "bg-orange-500" },
  "bac-credomatic":   { name: "BAC Credomatic",   badge: "bg-green-100 text-green-800",   accent: "bg-green-600" },
  "credisiman":       { name: "Credisiman",       badge: "bg-purple-100 text-purple-800", accent: "bg-purple-600" },
  "banco-agricola":   { name: "Banco Agrícola",   badge: "bg-teal-100 text-teal-800",     accent: "bg-teal-600" },
};

const CATEGORY_ICONS: Record<CategoryId, string> = {
  gasolina: "⛽", supermercados: "🛒", farmacias: "💊",
  restaurantes: "🍽️", streaming: "🎬", otros: "📦",
};

function mustReport(text: string): boolean {
  return /reporta|reportar|repor|reporte/i.test(text);
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

interface Props {
  promo: Promo;
  onClose: () => void;
}

export function PromoModal({ promo, onClose }: Props) {
  const bank = BANK_CONFIG[promo.bankId];
  const categoryIcon = CATEGORY_ICONS[promo.categoryId] ?? "📦";
  const combinedText = `${promo.title} ${promo.description ?? ""}`;
  const needsReport = mustReport(combinedText);

  const days = promo.expiresAt ? daysUntil(promo.expiresAt) : null;
  const expiresFormatted = promo.expiresAt
    ? new Date(promo.expiresAt).toLocaleDateString("es-SV", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      })
    : null;

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">

        {/* Barra de color del banco */}
        <div className={`h-1.5 w-full ${bank?.accent ?? "bg-gray-400"}`} />

        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${bank?.badge ?? "bg-gray-100 text-gray-700"}`}>
              {bank?.name ?? promo.bankId}
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
              {categoryIcon} {promo.categoryId}
            </span>
            {promo.discountValue && (
              <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                {promo.discountValue}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-2 text-gray-400 hover:text-gray-600 transition-colors text-xl font-bold leading-none"
          >
            ×
          </button>
        </div>

        {/* Contenido scrollable */}
        <div className="overflow-y-auto flex-1 px-5 pb-6 space-y-4">

          {/* Imagen */}
          {promo.imageUrl && (
            <div className="rounded-xl overflow-hidden h-48 bg-gray-100">
              <img src={promo.imageUrl} alt={promo.title} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Título */}
          <h2 className="text-lg font-bold text-gray-900 leading-snug">
            {promo.title}
          </h2>

          {/* Descripción */}
          {promo.description && (
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
              {promo.description}
            </p>
          )}

          {/* Info cards */}
          <div className="grid grid-cols-1 gap-3">

            {/* Vencimiento */}
            {expiresFormatted && days !== null && (
              <div className={`flex items-start gap-3 p-3.5 rounded-xl text-sm
                ${days <= 3 ? "bg-red-50 border border-red-200" :
                  days <= 7 ? "bg-amber-50 border border-amber-200" :
                  "bg-gray-50 border border-gray-200"}`}>
                <span className="text-xl">📅</span>
                <div>
                  <p className={`font-bold ${days <= 3 ? "text-red-700" : days <= 7 ? "text-amber-700" : "text-gray-700"}`}>
                    {days <= 0 ? "¡Vence hoy!" : days === 1 ? "Vence mañana" : `Vence en ${days} días`}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5 capitalize">{expiresFormatted}</p>
                </div>
              </div>
            )}

            {/* Debe reportar compra */}
            {needsReport && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-sm">
                <span className="text-xl">📋</span>
                <div>
                  <p className="font-bold text-blue-700">Debes reportar tu compra</p>
                  <p className="text-blue-600 text-xs mt-0.5">
                    Esta promo requiere que reportes la compra para recibir el beneficio.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Botón ver en sitio del banco */}
          {promo.sourceUrl && (
            <a
              href={promo.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-700 transition-colors"
            >
              Ver en sitio del banco
              <span>↗</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
