import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import type { Promo } from "@promocards/types";
import { BANK_COLORS, BANK_NAMES, CATEGORY_ICONS, CATEGORY_LABELS } from "../lib/constants";

interface PromoCardProps {
  promo: Promo;
  onPress: (promo: Promo) => void;
}

export function PromoCard({ promo, onPress }: PromoCardProps) {
  const bankColor = BANK_COLORS[promo.bankId];
  const expiresAt = promo.expiresAt
    ? new Date(promo.expiresAt).toLocaleDateString("es-SV", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(promo)} activeOpacity={0.85}>
      {promo.imageUrl ? (
        <Image
          source={{ uri: promo.imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: bankColor }]}>
          <Text style={styles.imagePlaceholderText}>
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

        <Text style={styles.title} numberOfLines={2}>{promo.title}</Text>

        <View style={styles.footer}>
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{promo.discountValue}</Text>
          </View>
          {expiresAt && (
            <Text style={styles.expires}>Vence: {expiresAt}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  image: {
    width: "100%",
    height: 160,
  },
  imagePlaceholder: {
    width: "100%",
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderText: {
    color: "#fff",
    fontSize: 48,
    fontWeight: "700",
  },
  body: {
    padding: 12,
    gap: 8,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bankBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bankBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  category: {
    fontSize: 12,
    color: "#666",
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  discountBadge: {
    backgroundColor: "#f0fdf4",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  discountText: {
    color: "#15803d",
    fontSize: 13,
    fontWeight: "700",
  },
  expires: {
    fontSize: 11,
    color: "#888",
  },
});
