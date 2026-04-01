import { getAdminPromosFromDB } from "@/lib/queries";
import { PromoModerationTable } from "@/components/admin/PromoModerationTable";
import type { AdminPromo } from "@/lib/admin-api";

export default async function AdminPromosPage() {
  let promos: AdminPromo[] = [];

  try {
    promos = await getAdminPromosFromDB();
  } catch {
    // Mostrar tabla vacía si hay error
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-gray-900">Promociones</h2>
        <p className="text-sm text-gray-500 mt-1">
          Revisa y corrige la categoría, título o descripción de cualquier promo.
          También puedes marcarla como inactiva antes de que venza.
        </p>
      </div>

      <PromoModerationTable initialPromos={promos} />
    </div>
  );
}
