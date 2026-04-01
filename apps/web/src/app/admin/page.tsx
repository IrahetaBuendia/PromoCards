import { getScraperRunsFromDB } from "@/lib/queries";
import { ScraperStatusPanel } from "@/components/admin/ScraperStatusPanel";
import type { BankId } from "@promocards/types";
import type { ScraperRun } from "@/lib/admin-api";

export default async function AdminPage() {
  let latestRuns: Partial<Record<BankId, ScraperRun>> = {};

  try {
    const runs = await getScraperRunsFromDB();
    latestRuns = runs.reduce((acc, run) => {
      if (!acc[run.bank_id as BankId]) acc[run.bank_id as BankId] = run as ScraperRun;
      return acc;
    }, {} as Partial<Record<BankId, ScraperRun>>);
  } catch {
    // Mostrar panel vacío si hay error
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-gray-900">Scrapers</h2>
        <p className="text-sm text-gray-500 mt-1">
          Estado de los scrapers por banco. Se ejecutan automáticamente cada 4 horas
          vía GitHub Actions. Las filas en amarillo llevan más de 6 h sin actualizar.
        </p>
      </div>

      <ScraperStatusPanel latestRuns={latestRuns} />
    </div>
  );
}
