import { StyleSheet, Text, View } from "react-native";
import type { DashboardMetrics } from "@promocards/types";

interface MetricsPanelProps {
  metrics: DashboardMetrics;
}

export function MetricsPanel({ metrics }: MetricsPanelProps) {
  return (
    <View style={styles.container}>
      <MetricCard
        label="Promos activas"
        value={String(metrics.totalActivePromos)}
        icon="🎯"
      />
      <MetricCard
        label="Mejor descuento"
        value={metrics.bestDiscountToday ?? "—"}
        icon="⚡"
      />
      <MetricCard
        label="Vencen esta semana"
        value={String(metrics.expiringThisWeek)}
        icon="⏰"
      />
    </View>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  icon: string;
}

function MetricCard({ label, value, icon }: MetricCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    gap: 4,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  icon: {
    fontSize: 22,
  },
  value: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
  },
  label: {
    fontSize: 11,
    color: "#666",
    textAlign: "center",
  },
});
