import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import type { CategoryId, BankId, Promo } from "../../lib/types";
import { matchesMyCards } from "../../lib/types";
import { fetchBankUpdates, fetchPromos } from "../../lib/api";
import { PromoCard } from "../../components/PromoCard";
import { FilterBar } from "../../components/FilterBar";
import { BANK_IDS, BANK_NAMES } from "../../lib/constants";
import { usePromoPreferences } from "../../lib/preferences";

export default function PromosScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [selectedBank, setSelectedBank] = useState<BankId | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [cardsOpen, setCardsOpen] = useState(false);
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [onlyMyCards, setOnlyMyCards] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [today, setToday] = useState(false);
  const [sort, setSort] = useState<"relevance" | "expiry">("relevance");
  const { banks, favorites, cardTypes, toggleBank, setCardType } = usePromoPreferences();
  const updates = useQuery({ queryKey: ["bank-updates"], queryFn: fetchBankUpdates, enabled: updatesOpen });

  const { data: promos, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["promos", selectedCategory, selectedBank, search, today, sort],
    queryFn: () =>
      fetchPromos({
        categoryId: selectedCategory ?? undefined,
        bankId: selectedBank ?? undefined,
        search,
        today,
        sort,
      }),
  });

  const handlePromoPress = useCallback(
    (promo: Promo) => {
      router.push(`/promo/${promo.id}`);
    },
    [router]
  );

  function submitSearch() {
    const term = searchInput.trim();
    setSearchInput(term);
    setSearch(term);
    Keyboard.dismiss();
  }

  function clearSearch() {
    setSearchInput("");
    setSearch("");
  }

  const visiblePromos = isError ? undefined : promos?.filter((promo) =>
    (!onlyMyCards || banks.length === 0 || matchesMyCards(promo, banks, cardTypes)) &&
    (!onlyFavorites || favorites.includes(promo.id)),
  );
  if (!onlyMyCards && sort !== "expiry" && banks.length > 0) {
    visiblePromos?.sort((a, b) => Number(matchesMyCards(b, banks, cardTypes)) - Number(matchesMyCards(a, banks, cardTypes)));
  }
  let emptyState = (
    <View style={styles.centered}>
      <Text style={styles.emptyText}>
        {search ? "No encontramos promociones para esta búsqueda. Prueba con otro nombre o cambia los filtros."
          : "No hay promociones con estos filtros."}
      </Text>
      {search && (selectedBank || selectedCategory || today) && <Text style={styles.retryText} onPress={() => {
        setSelectedBank(null);
        setSelectedCategory(null);
        setToday(false);
      }}>Buscar sin filtros</Text>}
    </View>
  );

  if (isLoading) {
    emptyState = (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Cargando promociones…</Text>
      </View>
    );
  } else if (isError) {
    emptyState = (
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
      <View style={styles.searchRow}>
        <TextInput
          accessibilityLabel="Buscar promociones por producto o tienda"
          placeholder="Ej. arreglos florales"
          placeholderTextColor="#64748b"
          value={searchInput}
          onChangeText={setSearchInput}
          onSubmitEditing={submitSearch}
          returnKeyType="search"
          autoCapitalize="none"
          maxLength={150}
          style={styles.searchInput}
        />
        {(searchInput !== "" || search !== "") && (
          <Pressable accessibilityRole="button" accessibilityLabel="Limpiar búsqueda" onPress={clearSearch} style={styles.clearButton}>
            <Text style={styles.clearText}>×</Text>
          </Pressable>
        )}
        <Pressable accessibilityRole="button" onPress={submitSearch} style={styles.searchButton}>
          <Text style={styles.searchButtonText}>Buscar</Text>
        </Pressable>
      </View>
      <View style={styles.controls}>
        <Control label="Filtros" selected={filtersOpen} onPress={() => setFiltersOpen(!filtersOpen)} />
        <Control label="Mis tarjetas" selected={cardsOpen} onPress={() => setCardsOpen(!cardsOpen)} />
        <Control label="Favoritos" selected={onlyFavorites} onPress={() => setOnlyFavorites(!onlyFavorites)} />
      </View>
      {filtersOpen && <>
        <FilterBar
        selectedCategory={selectedCategory}
        selectedBank={selectedBank}
        onCategoryChange={setSelectedCategory}
        onBankChange={setSelectedBank}
        />
        <View style={styles.controls}>
          <Control label="Válidas hoy" selected={today} onPress={() => setToday(!today)} />
          <Control label={sort === "expiry" ? "Por vencimiento" : "Por relevancia"} selected={sort === "expiry"}
            onPress={() => setSort(sort === "expiry" ? "relevance" : "expiry")} />
          <Control label="Actualización por banco" selected={updatesOpen} onPress={() => setUpdatesOpen(!updatesOpen)} />
        </View>
        {updatesOpen && <View style={styles.controls}>
          {updates.isLoading && <Text style={styles.hint}>Consultando actualizaciones…</Text>}
          {updates.isError && <Text style={styles.retryText} onPress={() => void updates.refetch()}>Reintentar consulta</Text>}
          {updates.data && BANK_IDS.map((bank) => {
            const stamp = updates.data?.[bank];
            const stale = stamp && Date.now() - Date.parse(stamp) > 86_400_000;
            const date = stamp && new Date(stamp).toLocaleString("es-SV", { timeZone: "America/El_Salvador" });
            return <Text key={bank} style={styles.hint}>
              {BANK_NAMES[bank]} · {date || "Sin verificar"}{stale ? " · Datos atrasados" : ""}
            </Text>;
          })}
        </View>}
      </>}
      {cardsOpen && <View style={styles.controls}>
        <Text style={styles.hint}>Selecciona el banco y el tipo de tarjeta</Text>
        {BANK_IDS.map((bank) => <Control key={bank} label={BANK_NAMES[bank]} selected={banks.includes(bank)}
          onPress={() => void toggleBank(bank)
            .catch(() => Alert.alert("No se pudo guardar la selección"))} />)}
        {banks.map((bank) => <View key={bank} style={styles.cardTypes}>
          <Text style={styles.hint}>{BANK_NAMES[bank]}</Text>
          {([["Crédito y débito", undefined], ["Crédito", "credit"], ["Débito", "debit"]] as const).map(([label, type]) =>
            <Control key={label} label={label} selected={cardTypes[bank] === type}
              onPress={() => void setCardType(bank, type).catch(() => Alert.alert("No se pudo guardar el tipo de tarjeta"))} />)}
        </View>)}
        {banks.length > 0 && <Control label="Solo mis tarjetas" selected={onlyMyCards} onPress={() => setOnlyMyCards(!onlyMyCards)} />}
      </View>}
      <FlatList
        data={visiblePromos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PromoCard promo={item} onPress={handlePromoPress} />
        )}
        contentContainerStyle={[styles.list, !visiblePromos?.length && styles.emptyList]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563eb" />
        }
        ListEmptyComponent={emptyState}
      />
    </View>
  );
}

function Control({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}
    style={[styles.control, selected && styles.controlSelected]}>
    <Text style={selected ? styles.controlTextSelected : styles.controlText}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  controls: {
    flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: "#f8fafc",
  },
  control: {
    minHeight: 38, paddingHorizontal: 10, justifyContent: "center", borderRadius: 8, borderWidth: 1, borderColor: "#cbd5e1", backgroundColor: "#fff",
  },
  controlSelected: { backgroundColor: "#1e3a8a", borderColor: "#1e3a8a" },
  controlText: { fontSize: 13, fontWeight: "600", color: "#334155" },
  controlTextSelected: { fontSize: 13, fontWeight: "600", color: "#fff" },
  hint: { width: "100%", fontSize: 13, color: "#475569" },
  cardTypes: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 6 },
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: "#f8fafc",
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    color: "#0f172a",
    fontSize: 14,
  },
  clearButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  clearText: {
    color: "#475569",
    fontSize: 24,
  },
  searchButton: {
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: "#2563eb",
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  list: {
    paddingVertical: 8,
    paddingBottom: 24,
  },
  emptyList: {
    flexGrow: 1,
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
