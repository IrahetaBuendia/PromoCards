"use client";

import { useState, useEffect } from "react";
import type { Promo, CategoryId } from "@promocards/types";

const PRIORITY_CATEGORIES: CategoryId[] = ["gasolina", "supermercados", "farmacias"];

const CATEGORY_ICONS: Record<CategoryId, string> = {
  gasolina: "⛽", supermercados: "🛒", farmacias: "💊",
  restaurantes: "🍽️", streaming: "🎬", otros: "📦",
};

interface Props {
  promos: Promo[];
}

export function NotificationButton({ promos }: Props) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  // Enviar notificaciones del navegador para promos que vencen pronto
  function sendNotifications(promos: Promo[]) {
    const urgent = promos.filter((p) => {
      if (!p.expiresAt || !PRIORITY_CATEGORIES.includes(p.categoryId)) return false;
      const days = Math.ceil((new Date(p.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return days >= 0 && days <= 3;
    });

    urgent.forEach((promo) => {
      const days = Math.ceil((new Date(promo.expiresAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const icon = CATEGORY_ICONS[promo.categoryId];
      new Notification(`${icon} PromoCards SV — Promo vence ${days === 0 ? "HOY" : days === 1 ? "mañana" : `en ${days} días`}`, {
        body: promo.title,
        icon: "/favicon.ico",
        tag: promo.id,
      });
    });

    if (urgent.length === 0) {
      new Notification("✅ PromoCards SV", {
        body: "No tienes promociones prioritarias próximas a vencer.",
        icon: "/favicon.ico",
      });
    }
  }

  async function handleClick() {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
      sendNotifications(promos);
    } else if (Notification.permission !== "denied") {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") sendNotifications(promos);
    }
  }

  if (!supported || permission === "denied") return null;

  return (
    <button
      onClick={handleClick}
      title="Activar alertas del navegador"
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200
        ${permission === "granted"
          ? "bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200"
          : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
        }`}
    >
      <span>{permission === "granted" ? "🔔" : "🔕"}</span>
      {permission === "granted" ? "Revisar alertas" : "Activar alertas"}
    </button>
  );
}
