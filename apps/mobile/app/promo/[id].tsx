import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useNavigation } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useQuery } from "@tanstack/react-query";
import { fetchPromo } from "../../lib/api";
import { API_BASE_URL, BANK_COLORS, BANK_NAMES, CATEGORY_LABELS } from "../../lib/constants";
import { promoTerms } from "../../lib/types";
import { usePromoPreferences } from "../../lib/preferences";
import { cancelPromoReminder, hasPromoReminder, schedulePromoReminder } from "../../lib/reminders";

export default function PromoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { favorites, toggleFavorite } = usePromoPreferences();
  const [savingReminder, setSavingReminder] = useState(false);
  const { data: promo, isLoading, isError, refetch } = useQuery({
    queryKey: ["promo", id],
    queryFn: () => fetchPromo(id),
    enabled: Boolean(id),
  });
  const { data: reminder, refetch: refreshReminder } = useQuery({
    queryKey: ["promo-reminder", id],
    queryFn: () => hasPromoReminder(id),
    enabled: Boolean(id) && Platform.OS === "android",
  });

  useEffect(() => {
    if (promo) navigation.setOptions({ title: BANK_NAMES[promo.bankId] });
  }, [promo, navigation]);

  if (isLoading) return <View style={styles.center}><ActivityIndicator color="#2563eb" /></View>;
  if (!promo || isError) return <View style={styles.center}>
    <Text>{isError ? "No se pudo cargar la promoción." : "Promoción no disponible."}</Text>
    {isError && <Action label="Reintentar" onPress={() => void refetch()} />}
  </View>;

  const bankColor = BANK_COLORS[promo.bankId];
  const canRemind = Boolean(promo.expiresAt && Date.parse(promo.expiresAt) > Date.now() + 3_600_000);
  const directUrl = API_BASE_URL + "/promo/" + encodeURIComponent(id);

  async function toggleReminder() {
    if (!promo) return;
    setSavingReminder(true);
    try {
      if (reminder) await cancelPromoReminder(id);
      else await schedulePromoReminder(promo);
      await refreshReminder();
      Alert.alert(reminder ? "Recordatorio cancelado" : "Recordatorio programado");
    } catch (error) {
      Alert.alert(error instanceof Error ? error.message : "No se pudo guardar el recordatorio.");
    } finally {
      setSavingReminder(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.subtitle}>{BANK_NAMES[promo.bankId]} · {CATEGORY_LABELS[promo.categoryId]}</Text>
      <Text style={styles.title}>{promo.title}</Text>
      {promo.details?.merchantName && <Text style={styles.subtitle}>{promo.details.merchantName}</Text>}
      {promo.imageUrl && <Image source={{ uri: promo.imageUrl }} style={styles.image} contentFit="contain" />}
      {Boolean(promo.discountValue) && <Text style={styles.discount}>{promo.discountValue}</Text>}
      {promo.description && <Text style={styles.description}>{promo.description}</Text>}
      {promoTerms(promo).map(({ label, value }) => <View key={label} style={styles.term}>
        <Text style={styles.termLabel}>{label}</Text>
        <Text style={styles.description}>{value}</Text>
      </View>)}
      {promo.details?.conditions && <View style={styles.term}>
        <Text style={styles.termLabel}>Condiciones de la fuente</Text>
        <Text style={styles.description}>{promo.details.conditions}</Text>
      </View>}
      {promo.sourceUrl && <Action label="Ver oferta original" color={bankColor} onPress={() => {
        void WebBrowser.openBrowserAsync(promo.sourceUrl).catch(() => Alert.alert("No se pudo abrir la fuente"));
      }} />}
      <Action label={favorites.includes(id) ? "Quitar de favoritos" : "Guardar en favoritos"} onPress={() => {
        void toggleFavorite(id).catch(() => Alert.alert("No se pudo guardar el favorito"));
      }} />
      {Platform.OS === "android" && (canRemind || reminder) && <Action
        label={reminder ? "Cancelar recordatorio" : "Recordarme antes de que venza"}
        disabled={savingReminder} onPress={() => void toggleReminder()} />}
      <Action label="Compartir promoción" onPress={() => {
        void Share.share({ message: promo.title + "\n" + directUrl }).catch(() => Alert.alert("No se pudo compartir"));
      }} />
    </ScrollView>
  );
}

function Action({ label, onPress, disabled, color }: { label: string; onPress: () => void; disabled?: boolean; color?: string }) {
  return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}
    style={[styles.action, color && { backgroundColor: color }]}>
    <Text style={[styles.actionText, color && { color: "#fff" }]}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 20, paddingBottom: 40, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  title: { fontSize: 22, fontWeight: "700", color: "#0f172a" },
  subtitle: { fontSize: 14, color: "#475569", fontWeight: "600" },
  image: { width: "100%", height: 220, borderRadius: 12, backgroundColor: "#e2e8f0" },
  discount: { fontSize: 18, fontWeight: "700", color: "#047857" },
  description: { fontSize: 14, color: "#334155", lineHeight: 21 },
  term: { borderRadius: 10, backgroundColor: "#e8eef6", padding: 12, gap: 4 },
  termLabel: { color: "#0f172a", fontWeight: "700" },
  action: { minHeight: 44, alignItems: "center", justifyContent: "center", padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "#cbd5e1", backgroundColor: "#fff" },
  actionText: { fontWeight: "600", color: "#1e293b" },
});
