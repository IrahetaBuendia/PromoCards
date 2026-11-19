import { Suspense } from "react";
import Link from "next/link";
import Form from "next/form";
import { Search, X } from "lucide-react";
import type { CategoryId, BankId } from "@promocards/types";
import { getPromos } from "@/lib/api";
import { PromoGrid } from "@/components/dashboard/PromoGrid";
import { AlertBanner } from "@/components/dashboard/AlertBanner";
import { NotificationButton } from "@/components/dashboard/NotificationButton";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { FilterSidebar } from "@/components/dashboard/FilterSidebar";
import type { Promo } from "@promocards/types";
import { createClient } from "@/lib/supabase/server";

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
  searchParams: Promise<{ categoria?: string; banco?: string; hoy?: string; q?: string | string[] }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const { categoria, banco, hoy, q } = await searchParams;
  const search = typeof q === "string" ? q.trim() : "";
  const activeFilters = new URLSearchParams();
  if (categoria) activeFilters.set("categoria", categoria);
  if (banco) activeFilters.set("banco", banco);
  if (hoy) activeFilters.set("hoy", hoy);
  const clearSearchUrl = activeFilters.size ? `/?${activeFilters}` : "/";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const displayName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email ?? "";

  const [allPromos, fetchedPromos] = await Promise.all([
    getPromos(),
    getPromos({
      categoryId: categoria as CategoryId | undefined,
      bankId: banco as BankId | undefined,
      search,
    }),
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
            <Suspense fallback={null}>
              <NotificationButton promos={allPromos} />
            </Suspense>
            <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-3 py-1.5 rounded-full whitespace-nowrap">
              🟢 {allPromos.length} activas
            </span>
            {displayName && (
              <span className="text-xs text-gray-500 font-medium hidden sm:block">{displayName}</span>
            )}
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

        <Form action="/" role="search" scroll={false} className="flex items-center gap-2">
          {[...activeFilters].map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 shadow-sm focus-within:border-gray-500 focus-within:ring-1 focus-within:ring-gray-500">
            <Search aria-hidden="true" size={18} className="shrink-0 text-gray-500" />
            <input
              key={search}
              name="q"
              type="search"
              aria-label="Buscar promociones por producto o tienda"
              placeholder="Ej. arreglos florales o nombre de tienda"
              defaultValue={search}
              className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {search && (
              <Link
                href={clearSearchUrl}
                scroll={false}
                aria-label="Limpiar búsqueda"
                className="grid size-8 shrink-0 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              >
                <X aria-hidden="true" size={16} />
              </Link>
            )}
          </div>
          <button type="submit" className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700">
            Buscar
          </button>
        </Form>

        {/* Layout principal: botón toggle + sidebar + contenido */}
        <div className="flex gap-5 items-start">

          {/* Sidebar con filtros */}
          <Suspense fallback={null}>
            <FilterSidebar />
          </Suspense>

          {/* Contenido principal */}
          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 font-medium [overflow-wrap:anywhere]">
                {filteredPromos.length} {filteredPromos.length === 1 ? "promoción" : "promociones"}
                {search ? ` para «${search}»` : ""}
                {categoria ? ` · ${categoria}` : ""}
                {banco ? ` · ${banco}` : ""}
                {hoy === "1" ? " · válidas hoy" : ""}
              </p>
              <p className="text-xs text-gray-400 hidden sm:block">Clic en una tarjeta para ver detalles</p>
            </div>
            <PromoGrid promos={filteredPromos} hasSearch={Boolean(search)} />
          </div>
        </div>
      </div>

      <footer className="text-center py-8 text-xs text-gray-400 border-t border-gray-100 mt-8">
        PromoCards SV · Datos actualizados automáticamente desde los sitios oficiales de cada banco
      </footer>
    </div>
  );
}
