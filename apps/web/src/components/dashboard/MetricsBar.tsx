import type { DashboardMetrics } from "@promocards/types";

interface Props {
  metrics: DashboardMetrics;
}

export function MetricsBar({ metrics }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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
  label, value, icon, accent, bg, text,
}: {
  label: string; value: string; icon: string;
  accent: string; bg: string; text: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl ${bg} p-6 border border-white/60 shadow-sm`}>
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full bg-gradient-to-br ${accent} opacity-10 translate-x-6 -translate-y-6`} />
      <div className="text-3xl mb-3">{icon}</div>
      <div className={`text-3xl font-extrabold ${text}`}>{value}</div>
      <div className="text-sm text-gray-500 mt-1 font-medium">{label}</div>
    </div>
  );
}
