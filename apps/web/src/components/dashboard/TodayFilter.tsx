"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function TodayFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isActive = searchParams.get("hoy") === "1";

  function toggle() {
    const params = new URLSearchParams(searchParams.toString());
    if (isActive) params.delete("hoy");
    else params.set("hoy", "1");
    router.push(`/?${params.toString()}`);
  }

  // Nombre del día hoy en español
  const days = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const todayName = days[new Date().getDay()];

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200
        ${isActive
          ? "bg-indigo-600 text-white border-transparent shadow-md scale-105"
          : "bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50"
        }`}
    >
      <span>📅</span>
      Hoy ({todayName})
    </button>
  );
}
