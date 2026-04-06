"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { BankId } from "@promocards/types";

const BANKS: Array<{
  id: BankId | "todos";
  label: string;
  color: string;
  textColor: string;
  activeBg: string;
  activeText: string;
}> = [
  { id: "todos",            label: "Todos los bancos", color: "#e5e7eb", textColor: "#374151", activeBg: "#111827", activeText: "#ffffff" },
  { id: "credicomer",       label: "Credicomer",       color: "#ccfbf1", textColor: "#0f766e", activeBg: "#14b8a6", activeText: "#ffffff" },
  { id: "banco-industrial", label: "Banco Industrial", color: "#dbeafe", textColor: "#023866", activeBg: "#023866", activeText: "#ffffff" },
  { id: "fedecredito",      label: "Fedecrédito",      color: "#dcfce7", textColor: "#14532d", activeBg: "#31825b", activeText: "#ffffff" },
  { id: "bac-credomatic",   label: "BAC Credomatic",   color: "#fee2e2", textColor: "#991b1b", activeBg: "#dc2626", activeText: "#ffffff" },
  { id: "credisiman",       label: "Credisiman",       color: "#e0e7ff", textColor: "#0002b8", activeBg: "#0002b8", activeText: "#ffffff" },
  { id: "banco-agricola",   label: "Banco Agrícola",   color: "#fef9c3", textColor: "#713f12", activeBg: "#facc00", activeText: "#713f12" },
  { id: "banco-cuscatlan",  label: "Banco Cuscatlán",  color: "#dceef5", textColor: "#01426a", activeBg: "#01426a", activeText: "#ffffff" },
];

export function BankFilter({ vertical = false }: { vertical?: boolean }) {
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
    <div className={vertical ? "flex flex-col gap-1" : "flex flex-wrap gap-2"}>
      {BANKS.map((bank) => {
        const isActive = active === bank.id;
        const bg    = isActive ? bank.activeBg  : bank.color;
        const color = isActive ? bank.activeText : bank.textColor;

        return (
          <button
            key={bank.id}
            onClick={() => handleSelect(bank.id)}
            style={{ backgroundColor: bg, color }}
            className={`font-semibold transition-all duration-200
              ${vertical
                ? "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-left"
                : `px-4 py-2 rounded-full text-sm border border-transparent ${isActive ? "shadow-md scale-105" : ""}`
              }`}
          >
            {vertical ? bank.label : bank.label}
          </button>
        );
      })}
    </div>
  );
}
