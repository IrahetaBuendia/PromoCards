import type { DashboardMetrics } from "@promocards/types";

interface Props {
  metrics: DashboardMetrics;
}

export function MetricsBar({ metrics }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <MetricCard
        label="Promociones activas"
        value={metrics.totalActivePromos.toString()}
        icon="🏷️"
        accent="from-blue-500 to-blue-600"
        bg="bg-blue-50"
        text="text-blue-700"
      />
      <MetricCard
        label="Mejor descuento hoy"
        value={metrics.bestDiscountToday ?? "—"}
        icon="⚡"
        accent="from-emerald-500 to-emerald-600"
        bg="bg-emerald-50"
        text="text-emerald-700"
      />
      <MetricCard
        label="Vencen esta semana"
        value={metrics.expiringThisWeek.toString()}
        icon="⏰"
        accent="from-amber-500 to-amber-600"
        bg="bg-amber-50"
        text="text-amber-700"
      />
    </div>
  );
}

function MetricCard({
  label, value, icon, bg, text,
}: {
  label: string; value: string; icon: string;
  accent: string; bg: string; text: string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-xl ${bg} px-4 py-3 border border-white/60 shadow-sm`}>
      <span className="text-xl">{icon}</span>
      <div>
        <div className={`text-lg font-extrabold leading-none ${text}`}>{value}</div>
        <div className="text-xs text-gray-500 mt-0.5 font-medium">{label}</div>
      </div>
    </div>
  );
}
