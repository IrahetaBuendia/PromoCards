import { getScraperRunsFromDB, getScraperTriggersFromDB } from "@/lib/queries";
import { ScraperStatusPanel } from "@/components/admin/ScraperStatusPanel";
import type { BankId } from "@promocards/types";
import type { ScraperRun, ScraperTrigger } from "@/lib/admin-api";

export default async function AdminPage() {
  let latestRuns: Partial<Record<BankId, ScraperRun>> = {};
  let latestTriggers: Partial<Record<string, ScraperTrigger>> = {};

  try {
    const [runs, triggers] = await Promise.all([
      getScraperRunsFromDB(),
      getScraperTriggersFromDB(),
    ]);

    latestRuns = runs.reduce((acc, run) => {
      if (!acc[run.bank_id as BankId]) acc[run.bank_id as BankId] = run as ScraperRun;
      return acc;
    }, {} as Partial<Record<BankId, ScraperRun>>);

    // Último trigger por banco (null bank_id = "todos los bancos")
    latestTriggers = triggers.reduce((acc, t) => {
      const key = t.bank_id ?? "all";
      if (!acc[key]) acc[key] = t;
      return acc;
    }, {} as Partial<Record<string, ScraperTrigger>>);
  } catch {
    // Mostrar panel vacío si hay error
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-gray-900">Scrapers</h2>
        <p className="text-sm text-gray-500 mt-1">
          Estado de los scrapers por banco. Se ejecutan automáticamente a las 7:00 AM,
          12:00 PM y 6:00 PM (hora El Salvador) vía GitHub Actions. Las filas en amarillo llevan más de 6 h sin actualizar.
        </p>
      </div>

      <ScraperStatusPanel latestRuns={latestRuns} latestTriggers={latestTriggers} />
    </div>
  );
}
