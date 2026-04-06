import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { CategoryId, BankId } from "@promocards/types";
import {
  BANK_COLORS,
  BANK_NAMES,
  BANK_IDS,
  CATEGORY_ICONS,
  CATEGORY_LABELS,
  SORTED_CATEGORIES,
} from "../lib/constants";

interface FilterBarProps {
  selectedCategory: CategoryId | null;
  selectedBank: BankId | null;
  onCategoryChange: (category: CategoryId | null) => void;
  onBankChange: (bank: BankId | null) => void;
}

export function FilterBar({
  selectedCategory,
  selectedBank,
  onCategoryChange,
  onBankChange,
}: FilterBarProps) {
  return (
    <View style={styles.container}>
      {/* Categorías */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        <Chip
          label="Todas"
          active={selectedCategory === null}
          onPress={() => onCategoryChange(null)}
        />
        {SORTED_CATEGORIES.map((cat) => (
          <Chip
            key={cat}
            label={`${CATEGORY_ICONS[cat]} ${CATEGORY_LABELS[cat]}`}
            active={selectedCategory === cat}
            onPress={() => onCategoryChange(selectedCategory === cat ? null : cat)}
          />
        ))}
      </ScrollView>

      {/* Bancos */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        <Chip
          label="Todos los bancos"
          active={selectedBank === null}
          onPress={() => onBankChange(null)}
        />
        {BANK_IDS.map((bank) => (
          <Chip
            key={bank}
            label={BANK_NAMES[bank]}
            active={selectedBank === bank}
            activeColor={BANK_COLORS[bank]}
            onPress={() => onBankChange(selectedBank === bank ? null : bank)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

interface ChipProps {
  label: string;
  active: boolean;
  activeColor?: string;
  onPress: () => void;
}

function Chip({ label, active, activeColor = "#2563eb", onPress }: ChipProps) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        active && { backgroundColor: activeColor, borderColor: activeColor },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
    paddingVertical: 8,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  row: {
    flexDirection: "row",
    paddingHorizontal: 12,
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#fff",
  },
  chipText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  chipTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
});
