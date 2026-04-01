"use client";

import { useState } from "react";
import { triggerScrape } from "@/lib/admin-api";
import type { BankId } from "@promocards/types";

interface Props {
  bankId?: BankId;
  label: string;
  variant?: "primary" | "ghost";
}

export function ScrapeButton({ bankId, label, variant = "ghost" }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setStatus("loading");
    setMessage(null);

    try {
      const result = await triggerScrape(bankId);
      setStatus("ok");
      setMessage(result.message);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setTimeout(() => {
        setStatus("idle");
        setMessage(null);
      }, 5000);
    }
  }

  const baseClass =
    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  const variantClass =
    variant === "primary"
      ? "bg-gray-900 text-white hover:bg-gray-700"
      : "bg-gray-100 text-gray-700 hover:bg-gray-200";

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={handleClick}
        disabled={status === "loading"}
        className={`${baseClass} ${variantClass}`}
      >
        {status === "loading" ? (
          <>
            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Iniciando…
          </>
        ) : (
          <>{label}</>
        )}
      </button>
      {message && (
        <p className={`text-xs ${status === "error" ? "text-red-500" : "text-emerald-600"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
