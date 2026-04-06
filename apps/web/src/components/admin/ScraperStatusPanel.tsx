import { ScrapeButton } from "./ScrapeButton";
import type { ScraperRun, ScraperTrigger } from "@/lib/admin-api";
import type { BankId } from "@promocards/types";

const BANK_NAMES: Record<BankId, string> = {
  fedecredito: "Fedecrédito",
  "banco-industrial": "Banco Industrial",
  credicomer: "Credicomer",
  "bac-credomatic": "BAC Credomatic",
  credisiman: "Credisiman",
  "banco-agricola": "Banco Agrícola",
  "banco-cuscatlan": "Banco Cuscatlán",
};

const ALL_BANKS: BankId[] = [
  "fedecredito",
  "banco-industrial",
  "credicomer",
  "bac-credomatic",
  "credisiman",
  "banco-agricola",
  "banco-cuscatlan",
];

interface Props {
  latestRuns: Partial<Record<BankId, ScraperRun>>;
  latestTriggers: Partial<Record<string, ScraperTrigger>>;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  return `hace ${Math.floor(hrs / 24)} días`;
}

function StatusBadge({ status }: { status: ScraperRun["status"] | "never" }) {
  if (status === "success")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        OK
      </span>
    );
  if (status === "error")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        Error
      </span>
    );
  if (status === "running")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        Corriendo
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
      Sin datos
    </span>
  );
}

export function ScraperStatusPanel({ latestRuns, latestTriggers }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-gray-900">Estado de scrapers</h2>
          <p className="text-xs text-gray-400 mt-0.5">Último scrape por banco</p>
        </div>
        <ScrapeButton label="⟳ Scrape todos" variant="primary" />
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
                Estado
              </th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                Promos
              </th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                Último scrape
              </th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                Error
              </th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                Disparado por
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {ALL_BANKS.map((bankId) => {
              const run = latestRuns[bankId];
              const isStale =
                run
                  ? Date.now() - new Date(run.started_at).getTime() > 6 * 60 * 60 * 1000
                  : true;

              const trigger = latestTriggers[bankId] ?? latestTriggers["all"];

              return (
                <tr key={bankId} className={`hover:bg-gray-50/50 transition-colors ${isStale ? "bg-amber-50/30" : ""}`}>
                  <td className="px-6 py-4 font-semibold text-gray-900 whitespace-nowrap">
                    {BANK_NAMES[bankId]}
                    {isStale && (
                      <span className="ml-2 text-xs text-amber-600 font-normal">⚠ &gt;6h</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={run?.status ?? "never"} />
                  </td>
                  <td className="px-4 py-4 text-gray-700 font-medium">
                    {run ? run.promos_found : "—"}
                  </td>
                  <td className="px-4 py-4 text-gray-500 whitespace-nowrap">
                    {run ? timeAgo(run.started_at) : "—"}
                  </td>
                  <td className="px-4 py-4 max-w-xs">
                    {run?.error_message ? (
                      <span className="text-xs text-red-600 truncate block" title={run.error_message}>
                        {run.error_type}: {run.error_message.substring(0, 60)}
                        {run.error_message.length > 60 ? "…" : ""}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 max-w-[160px]">
                    {trigger ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-gray-700 font-medium truncate" title={trigger.user_email}>
                          {trigger.user_name ?? trigger.user_email}
                        </span>
                        <span className="text-xs text-gray-400">{timeAgo(trigger.triggered_at)}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">Automático</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <ScrapeButton bankId={bankId} label="Scrape" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
