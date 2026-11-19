import { Suspense } from "react";
import Link from "next/link";
import Form from "next/form";
import { Search, X } from "lucide-react";
import { BANK_NAMES, type CategoryId, type BankId } from "@promocards/types";
import { getPromos } from "@/lib/api";
import { PromoGrid } from "@/components/dashboard/PromoGrid";
import { AlertBanner } from "@/components/dashboard/AlertBanner";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { FilterSidebar } from "@/components/dashboard/FilterSidebar";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/supabase/auth-guard";
import { getBankUpdates } from "@/lib/queries";

interface Props {
  searchParams: Promise<{ categoria?: string; banco?: string; hoy?: string; orden?: string; q?: string | string[] }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const { categoria, banco, hoy, orden, q } = await searchParams;
  const search = typeof q === "string" ? q.trim().slice(0, 150) : "";
  const activeFilters = new URLSearchParams();
  if (categoria) activeFilters.set("categoria", categoria);
  if (banco) activeFilters.set("banco", banco);
  if (hoy) activeFilters.set("hoy", hoy);
  if (orden === "expiry") activeFilters.set("orden", orden);
  const clearSearchUrl = activeFilters.size ? `/?${activeFilters}` : "/";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const displayName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email ?? "";

  const allPromosRequest = getPromos();
  const [allPromos, filteredPromos, updates] = await Promise.all([
    allPromosRequest,
    categoria || banco || search || hoy === "1" || orden === "expiry" ? getPromos({
      categoryId: categoria as CategoryId | undefined,
      bankId: banco as BankId | undefined,
      search,
      today: hoy === "1",
      sort: orden === "expiry" ? "expiry" : undefined,
    }) : allPromosRequest,
    getBankUpdates().catch(() => ({} as Partial<Record<BankId, string>>)),
  ]);

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
              <p className="text-xs text-gray-500 mt-0.5">{Object.keys(BANK_NAMES).length} bancos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-3 py-1.5 rounded-full whitespace-nowrap">
              🟢 {allPromos.length} activas
            </span>
            {displayName && (
              <span className="text-xs text-gray-500 font-medium hidden sm:block">{displayName}</span>
            )}
            {user && isAdmin(user) && <Link
              href="/admin"
              className="text-xs font-semibold text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors hidden sm:inline-flex"
            >
              Admin
            </Link>}
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
              maxLength={150}
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
        <div className="flex flex-col gap-4 md:flex-row md:items-start">

          {/* Sidebar con filtros */}
          <Suspense fallback={null}>
            <FilterSidebar />
          </Suspense>

          {/* Contenido principal */}
          <div className="w-full flex-1 min-w-0 space-y-4">
            <PromoGrid key={user?.id ?? "guest"} promos={filteredPromos} search={search} userId={user?.id} />
          </div>
        </div>
        <details className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
          <summary className="cursor-pointer font-semibold">Última actualización por banco</summary>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {(Object.keys(BANK_NAMES) as BankId[]).map((bank) => {
              const last = updates[bank];
              const stale = last && Date.now() - Date.parse(last) > 24 * 60 * 60 * 1000;
              return <li key={bank}><strong>{BANK_NAMES[bank]}</strong>{" · "}
                {last ? new Intl.DateTimeFormat("es-SV", { dateStyle: "medium", timeStyle: "short", timeZone: "America/El_Salvador" }).format(new Date(last)) : "Sin verificación registrada"}
                {stale && <span className="ml-1 font-medium text-amber-700">Datos atrasados</span>}
              </li>;
            })}
          </ul>
        </details>
      </div>

      <footer className="text-center py-8 text-xs text-gray-400 border-t border-gray-100 mt-8">
        PromoCards SV · Datos actualizados automáticamente desde los sitios oficiales de cada banco
      </footer>
    </div>
  );
}
