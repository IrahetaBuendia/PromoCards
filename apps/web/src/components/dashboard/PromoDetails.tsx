"use client";

import { useState } from "react";
import { BANK_NAMES, CATEGORY_LABELS, promoTerms, type Promo } from "@promocards/types";

function saveCalendarReminder(promo: Promo, url: string) {
  if (!promo.expiresAt) return;
  const expires = new Date(promo.expiresAt);
  const stamp = (date: Date) => date.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const alarm = expires.getTime() - Date.now() >= 86_400_000 ? "-P1D" : "-PT1H";
  const title = promo.title.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/[;,]/g, "\\$&");
  const content = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//PromoCards SV//Recordatorios//ES", "BEGIN:VEVENT",
    `UID:${promo.id}@promocards-sv`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(expires)}`,
    `SUMMARY:Vence ${title}`, `URL:${url}`, "BEGIN:VALARM", `TRIGGER:${alarm}`,
    "ACTION:DISPLAY", "DESCRIPTION:Vence una promoción guardada", "END:VALARM", "END:VEVENT", "END:VCALENDAR", "",
  ].join("\r\n");
  const objectUrl = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = "recordatorio-promocards.ics";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
}

export function PromoDetails({ promo, favorite, onFavorite }: {
  promo: Promo;
  favorite?: boolean;
  onFavorite?: () => void;
}) {
  const [feedback, setFeedback] = useState("");
  const canRemind = Boolean(promo.expiresAt && Date.parse(promo.expiresAt) > Date.now() + 3_600_000);
  const pageUrl = () => new URL(`/promo/${promo.id}`, window.location.origin).href;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(pageUrl());
      setFeedback("Enlace copiado.");
    } catch {
      setFeedback(pageUrl());
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-gray-600">
        {BANK_NAMES[promo.bankId]} · {CATEGORY_LABELS[promo.categoryId]}{promo.discountValue && ` · ${promo.discountValue}`}
      </p>
      <h1 id="promo-title" className="text-xl font-bold text-gray-900">{promo.title}</h1>
      {promo.details?.merchantName && <p className="text-sm text-gray-700">{promo.details.merchantName}</p>}
      {promo.imageUrl && <img src={promo.imageUrl} alt="" className="max-h-64 w-full rounded-xl object-contain bg-gray-50" />}
      {promo.description && <p className="text-sm text-gray-700 whitespace-pre-line">{promo.description}</p>}
      <dl className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
        {promoTerms(promo).map(({ label, value }) => (
          <div key={label}><dt className="font-semibold">{label}</dt><dd className="text-gray-700">{value}</dd></div>
        ))}
      </dl>
      {promo.details?.conditions && <details className="text-sm">
        <summary className="cursor-pointer font-semibold">Condiciones de la fuente</summary>
        <p className="mt-2 whitespace-pre-line text-gray-700">{promo.details.conditions}</p>
      </details>}
      {promo.sourceUrl && <a href={promo.sourceUrl} target="_blank" rel="noreferrer" className="block rounded-lg bg-gray-900 py-2.5 text-center text-sm font-semibold text-white">Ver oferta original ↗</a>}
      <div className="flex flex-wrap gap-2 text-sm">
        {onFavorite && <button type="button" aria-pressed={favorite} onClick={onFavorite} className="rounded-lg border px-3 py-2">{favorite ? "Quitar de favoritos" : "Guardar en favoritos"}</button>}
        <button type="button" onClick={copyLink} className="rounded-lg border px-3 py-2">Copiar enlace</button>
        <button type="button" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${promo.title} ${pageUrl()}`)}`, "_blank", "noopener,noreferrer")} className="rounded-lg border px-3 py-2">Compartir por WhatsApp</button>
        {canRemind && <button type="button" onClick={() => { saveCalendarReminder(promo, pageUrl()); setFeedback("Abre el archivo en tu calendario para activar el recordatorio."); }} className="rounded-lg border px-3 py-2">Recordar en mi calendario</button>}
      </div>
      {feedback && <p role="status" className="break-all text-sm text-gray-700">{feedback}</p>}
    </div>
  );
}
