"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { CategoryId } from "@promocards/types";

const CATEGORIES: Array<{ id: CategoryId | "todas"; label: string; icon: string }> = [
  { id: "todas",         label: "Todas",         icon: "✨" },
  { id: "gasolina",      label: "Gasolina",      icon: "⛽" },
  { id: "supermercados", label: "Supermercados",  icon: "🛒" },
  { id: "farmacias",     label: "Farmacias",     icon: "💊" },
  { id: "restaurantes",  label: "Restaurantes",  icon: "🍽️" },
  { id: "streaming",     label: "Streaming",     icon: "🎬" },
  { id: "otros",         label: "Otros",         icon: "📦" },
];

export function CategoryFilter({ vertical = false }: { vertical?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("categoria") ?? "todas";

  function handleSelect(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id === "todas") params.delete("categoria");
    else params.set("categoria", id);
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className={vertical ? "flex flex-col gap-1" : "flex flex-wrap gap-2"}>
      {CATEGORIES.map((cat) => {
        const isActive = active === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => handleSelect(cat.id)}
            className={`flex items-center gap-1.5 font-semibold transition-all duration-200
              ${vertical
                ? `w-full px-3 py-1.5 rounded-lg text-sm text-left ${isActive ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`
                : `px-4 py-2 rounded-full text-sm ${isActive ? "bg-gray-900 text-white shadow-md scale-105" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50"}`
              }`}
          >
            <span>{cat.icon}</span>
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
