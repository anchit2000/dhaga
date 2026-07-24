import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { COLORS } from "@/utils/constants";

import type { WrappedScopeKind } from "@/types";

interface ScopeChipsProps {
  options: ReadonlyArray<{ kind: WrappedScopeKind; label: string }>;
  activeKind: WrappedScopeKind;
  disabled: boolean;
  onSelect: (kind: WrappedScopeKind) => void;
}

/** Horizontal, scrollable row of scope chips. Presentational only. */
export function ScopeChips({ options, activeKind, disabled, onSelect }: ScopeChipsProps): React.JSX.Element {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {options.map((option) => {
        const active = option.kind === activeKind;
        return (
          <Pressable
            key={option.kind}
            onPress={() => onSelect(option.kind)}
            disabled={disabled}
            style={[styles.chip, active && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingRight: 4 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.seam,
    backgroundColor: COLORS.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: { backgroundColor: COLORS.amber, borderColor: COLORS.amber },
  label: { color: COLORS.paper, fontSize: 14, fontWeight: "600" },
  labelActive: { color: COLORS.ink },
});
