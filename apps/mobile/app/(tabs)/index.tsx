import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import type { CategoryId, BankId, Promo } from "@promocards/types";
import { fetchPromos } from "../../lib/api";
import { PromoCard } from "../../components/PromoCard";
import { FilterBar } from "../../components/FilterBar";

export default function PromosScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [selectedBank, setSelectedBank] = useState<BankId | null>(null);

  const { data: promos, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["promos", selectedCategory, selectedBank],
    queryFn: () =>
      fetchPromos({
        categoryId: selectedCategory ?? undefined,
        bankId: selectedBank ?? undefined,
      }),
  });

  const handlePromoPress = useCallback(
    (promo: Promo) => {
      router.push(`/promo/${promo.id}`);
    },
    [router]
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Cargando promociones…</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error al cargar las promos.</Text>
        <Text style={styles.retryText} onPress={() => refetch()}>
          Toca aquí para reintentar
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FilterBar
        selectedCategory={selectedCategory}
        selectedBank={selectedBank}
        onCategoryChange={setSelectedCategory}
        onBankChange={setSelectedBank}
      />
      <FlatList
        data={promos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PromoCard promo={item} onPress={handlePromoPress} />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563eb" />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No hay promos para este filtro.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  list: {
    paddingVertical: 8,
    paddingBottom: 24,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  loadingText: {
    color: "#64748b",
    fontSize: 14,
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
  emptyText: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
  },
});
