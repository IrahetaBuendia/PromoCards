import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/dashboard/LogoutButton";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verificación server-side: si no hay sesión, redirigir a login
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header admin */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/80 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-900 to-gray-600 flex items-center justify-center text-white text-lg font-bold shadow">
                P
              </div>
              <div>
                <h1 className="text-lg font-extrabold text-gray-900 leading-none">
                  PromoCards SV
                </h1>
                <p className="text-xs text-gray-400 mt-0.5">Panel de administración</p>
              </div>
            </div>
            {/* Nav */}
            <nav className="hidden sm:flex items-center gap-1">
              <Link
                href="/admin"
                className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Scrapers
              </Link>
              <Link
                href="/admin/promos"
                className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Promociones
              </Link>
              <Link
                href="/"
                className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                ← Dashboard
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold text-gray-700 leading-none">
                {user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email}
              </span>
              {(user.user_metadata?.full_name || user.user_metadata?.name) && (
                <span className="text-xs text-gray-400 leading-none mt-0.5">{user.email}</span>
              )}
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
