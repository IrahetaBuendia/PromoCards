import { useEffect } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useNavigation } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useQuery } from "@tanstack/react-query";
import { fetchPromos } from "../../lib/api";
import { BANK_COLORS, BANK_NAMES, CATEGORY_ICONS, CATEGORY_LABELS } from "../../lib/constants";

export default function PromoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();

  // Busca la promo en el caché de TanStack Query (ya cargada en la lista)
  const { data: promos, isLoading } = useQuery({
    queryKey: ["promos", null, null],
    queryFn: () => fetchPromos(),
    staleTime: 5 * 60 * 1000,
  });

  const promo = promos?.find((p) => p.id === id);

  useEffect(() => {
    if (promo) {
      navigation.setOptions({ title: BANK_NAMES[promo.bankId] });
    }
  }, [promo, navigation]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!promo) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Promo no encontrada.</Text>
      </View>
    );
  }

  const bankColor = BANK_COLORS[promo.bankId];

  const expiresAt = promo.expiresAt
    ? new Date(promo.expiresAt).toLocaleDateString("es-SV", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {promo.imageUrl ? (
        <Image
          source={{ uri: promo.imageUrl }}
          style={styles.image}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: bankColor }]}>
          <Text style={styles.placeholderText}>
            {BANK_NAMES[promo.bankId].charAt(0)}
          </Text>
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.badgeRow}>
          <View style={[styles.bankBadge, { backgroundColor: bankColor }]}>
            <Text style={styles.bankBadgeText}>{BANK_NAMES[promo.bankId]}</Text>
          </View>
          <Text style={styles.category}>
            {CATEGORY_ICONS[promo.categoryId]} {CATEGORY_LABELS[promo.categoryId]}
          </Text>
        </View>

        <Text style={styles.title}>{promo.title}</Text>

        <View style={styles.discountBadge}>
          <Text style={styles.discountLabel}>Descuento</Text>
          <Text style={styles.discountValue}>{promo.discountValue}</Text>
        </View>

        {promo.description && (
          <Text style={styles.description}>{promo.description}</Text>
        )}

        {expiresAt && (
          <View style={styles.expireRow}>
            <Text style={styles.expireIcon}>⏰</Text>
            <Text style={styles.expireText}>Vence el {expiresAt}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: bankColor }]}
          onPress={() => WebBrowser.openBrowserAsync(promo.sourceUrl)}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>Ver promo en el banco →</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  content: {
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: "#dc2626",
  },
  image: {
    width: "100%",
    height: 220,
  },
  imagePlaceholder: {
    width: "100%",
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: 72,
    color: "#fff",
    fontWeight: "700",
  },
  body: {
    padding: 20,
    gap: 16,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bankBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  bankBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  category: {
    fontSize: 13,
    color: "#666",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111",
    lineHeight: 28,
  },
  discountBadge: {
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    alignItems: "center",
  },
  discountLabel: {
    fontSize: 12,
    color: "#166534",
    fontWeight: "500",
  },
  discountValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#15803d",
  },
  description: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
  },
  expireRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fefce8",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  expireIcon: {
    fontSize: 16,
  },
  expireText: {
    fontSize: 13,
    color: "#92400e",
    fontWeight: "500",
  },
  ctaButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 4,
  },
  ctaText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
