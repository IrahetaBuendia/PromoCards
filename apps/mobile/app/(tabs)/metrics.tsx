import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { fetchMetrics } from "../../lib/api";
import { MetricsPanel } from "../../components/MetricsPanel";

export default function MetricsScreen() {
  const { data: metrics, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["metrics"],
    queryFn: fetchMetrics,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (isError || !metrics) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error al cargar estadísticas.</Text>
        <Text style={styles.retryText} onPress={() => refetch()}>
          Toca aquí para reintentar
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563eb" />
      }
    >
      <Text style={styles.sectionTitle}>Resumen general</Text>
      <MetricsPanel metrics={metrics} />

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>¿Cómo funciona?</Text>
        <Text style={styles.infoText}>
          Los scrapers corren automáticamente 3 veces al día (7am, 12pm y 6pm hora SV)
          y actualizan las promociones de los 7 bancos salvadoreños.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 20,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 16,
    color: "#dc2626",
    fontWeight: "600",
  },
  retryText: {
    fontSize: 14,
    color: "#2563eb",
    textDecorationLine: "underline",
  },
  infoBox: {
    margin: 16,
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    gap: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e40af",
  },
  infoText: {
    fontSize: 13,
    color: "#3b82f6",
    lineHeight: 20,
  },
});
