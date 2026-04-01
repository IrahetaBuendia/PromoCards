"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { BankId } from "@promocards/types";

// Orden de prioridad definido por el usuario
const BANKS: Array<{ id: BankId | "todos"; label: string; short: string; color: string; active: string }> = [
  { id: "todos",            label: "Todos los bancos", short: "Todos",    color: "border-gray-200 text-gray-600",         active: "bg-gray-900 text-white" },
  { id: "credicomer",       label: "Credicomer",       short: "Credicomer",color: "border-orange-200 text-orange-700",    active: "bg-orange-500 text-white" },
  { id: "banco-industrial", label: "Banco Industrial", short: "Industrial",color: "border-red-200 text-red-700",          active: "bg-red-600 text-white" },
  { id: "fedecredito",      label: "Fedecrédito",      short: "Fedecrédito",color: "border-blue-200 text-blue-700",       active: "bg-blue-600 text-white" },
  { id: "bac-credomatic",   label: "BAC Credomatic",   short: "BAC",      color: "border-green-200 text-green-700",       active: "bg-green-600 text-white" },
  { id: "credisiman",       label: "Credisiman",       short: "Siman",    color: "border-purple-200 text-purple-700",     active: "bg-purple-600 text-white" },
  { id: "banco-agricola",   label: "Banco Agrícola",   short: "Agrícola", color: "border-teal-200 text-teal-700",         active: "bg-teal-600 text-white" },
];

export function BankFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("banco") ?? "todos";

  function handleSelect(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id === "todos") params.delete("banco");
    else params.set("banco", id);
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {BANKS.map((bank) => {
        const isActive = active === bank.id;
        return (
          <button
            key={bank.id}
            onClick={() => handleSelect(bank.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200
              ${isActive
                ? `${bank.active} shadow-md scale-105 border-transparent`
                : `bg-white ${bank.color} hover:bg-gray-50`
              }`}
          >
            {bank.short}
          </button>
        );
      })}
    </div>
  );
}
