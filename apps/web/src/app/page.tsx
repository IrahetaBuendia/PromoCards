import { Suspense } from "react";
import Link from "next/link";
import type { CategoryId, BankId } from "@promocards/types";
import { getPromos, getMetrics } from "@/lib/api";
import { MetricsBar } from "@/components/dashboard/MetricsBar";
import { PromoGrid } from "@/components/dashboard/PromoGrid";
import { AlertBanner } from "@/components/dashboard/AlertBanner";
import { NotificationButton } from "@/components/dashboard/NotificationButton";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { FilterSidebar } from "@/components/dashboard/FilterSidebar";
import type { Promo } from "@promocards/types";

const DAYS_ES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

// Rangos que incluyen cada día de la semana (índice 0=domingo … 6=sábado)
const DAY_RANGES: Record<number, string[]> = {
  0: ["todos los días", "todos los dias", "diario", "permanente", "domingo", "fines de semana", "fin de semana", "lunes a domingo"],
  1: ["todos los días", "todos los dias", "diario", "permanente", "lunes", "lunes a viernes", "lunes a sábado", "lunes a sabado", "días hábiles", "dias habiles", "días de semana", "dias de semana", "lunes a domingo"],
  2: ["todos los días", "todos los dias", "diario", "permanente", "martes", "lunes a viernes", "lunes a sábado", "lunes a sabado", "días hábiles", "dias habiles", "días de semana", "dias de semana", "lunes a domingo"],
  3: ["todos los días", "todos los dias", "diario", "permanente", "miércoles", "miercoles", "lunes a viernes", "lunes a sábado", "lunes a sabado", "días hábiles", "dias habiles", "días de semana", "dias de semana", "lunes a domingo"],
  4: ["todos los días", "todos los dias", "diario", "permanente", "jueves", "lunes a viernes", "lunes a sábado", "lunes a sabado", "días hábiles", "dias habiles", "días de semana", "dias de semana", "lunes a domingo"],
  5: ["todos los días", "todos los dias", "diario", "permanente", "viernes", "lunes a viernes", "lunes a sábado", "lunes a sabado", "días hábiles", "dias habiles", "días de semana", "dias de semana", "lunes a domingo"],
  6: ["todos los días", "todos los dias", "diario", "permanente", "sábado", "sabado", "lunes a sábado", "lunes a sabado", "fines de semana", "fin de semana", "lunes a domingo"],
};

function filterToday(promos: Promo[]): Promo[] {
  const today = new Date();
  const dayIndex = today.getDay();
  const todayStr = today.toDateString();
  const ranges = DAY_RANGES[dayIndex] ?? [];

  return promos.filter((p) => {
    const text = `${p.title} ${p.description ?? ""}`.toLowerCase();
    // Menciona el día exacto o un rango que lo incluye
    const mentionsToday = ranges.some((r) => text.includes(r));
    // Vence hoy
    const expiresToday = p.expiresAt
      ? new Date(p.expiresAt).toDateString() === todayStr
      : false;
    return mentionsToday || expiresToday;
  });
}

interface Props {
  searchParams: Promise<{ categoria?: string; banco?: string; hoy?: string }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const { categoria, banco, hoy } = await searchParams;

  const [allPromos, fetchedPromos, metrics] = await Promise.all([
    getPromos(),
    getPromos({
      categoryId: categoria as CategoryId | undefined,
      bankId: banco as BankId | undefined,
    }),
    getMetrics(),
  ]);

  const filteredPromos = hoy === "1" ? filterToday(fetchedPromos) : fetchedPromos;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/80 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-900 to-gray-600 flex items-center justify-center text-white text-lg font-bold shadow">
              P
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-gray-900 leading-none">PromoCards SV</h1>
              <p className="text-xs text-gray-400 mt-0.5">6 bancos · actualiza 3 veces al día</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Suspense>
              <NotificationButton promos={allPromos} />
            </Suspense>
            <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-3 py-1.5 rounded-full whitespace-nowrap">
              🟢 {metrics.totalActivePromos} activas
            </span>
            <Link
              href="/admin"
              className="text-xs font-semibold text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors hidden sm:inline-flex"
            >
              Admin
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">

        {/* Alertas de vencimiento */}
        <AlertBanner promos={allPromos} />

        {/* Métricas */}
        <MetricsBar metrics={metrics} />

        {/* Layout principal: botón toggle + sidebar + contenido */}
        <div className="flex gap-5 items-start">

          {/* Sidebar con filtros */}
          <Suspense>
            <FilterSidebar />
          </Suspense>

          {/* Contenido principal */}
          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 font-medium">
                {filteredPromos.length} {filteredPromos.length === 1 ? "promoción" : "promociones"}
                {categoria ? ` · ${categoria}` : ""}
                {banco ? ` · ${banco}` : ""}
                {hoy === "1" ? " · válidas hoy" : ""}
              </p>
              <p className="text-xs text-gray-400 hidden sm:block">Clic en una tarjeta para ver detalles</p>
            </div>
            <PromoGrid promos={filteredPromos} />
          </div>
        </div>
      </div>

      <footer className="text-center py-8 text-xs text-gray-400 border-t border-gray-100 mt-8">
        PromoCards SV · Datos actualizados automáticamente desde los sitios oficiales de cada banco
      </footer>
    </div>
  );
}
