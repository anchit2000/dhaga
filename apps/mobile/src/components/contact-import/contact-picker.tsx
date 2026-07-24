import { Feather } from "@expo/vector-icons";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS } from "@/utils/constants";

import type { ImportItem, ImportOutcome } from "./use-contact-import";

interface ContactPickerProps {
  items: ImportItem[];
  selected: Set<string>;
  selectedCount: number;
  loading: boolean;
  busy: boolean;
  outcome: ImportOutcome | null;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onSubmit: () => void;
}

function OutcomeBanner({ outcome }: { outcome: ImportOutcome }): React.JSX.Element {
  if (outcome.kind === "error") return <Text style={styles.error}>{outcome.message}</Text>;
  return (
    <Text style={styles.done}>
      Imported {outcome.created} · skipped {outcome.skipped} already in Dhaga.
    </Text>
  );
}

/** The granted-permission UI: selectable list + import action. Presentational
 *  only — all state lives in useContactImport. */
export function ContactPicker(props: ContactPickerProps): React.JSX.Element {
  const { items, selected, selectedCount, loading, busy, outcome } = props;

  const renderItem = ({ item }: { item: ImportItem }): React.JSX.Element => {
    const isSelected = selected.has(item.id);
    return (
      <Pressable
        style={styles.row}
        onPress={() => props.onToggle(item.id)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected }}
      >
        <View style={[styles.check, isSelected && styles.checkOn]}>
          {isSelected ? <Feather name="check" size={14} color={COLORS.ink} /> : null}
        </View>
        <Text style={styles.rowName} numberOfLines={1}>
          {item.name}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        <Text style={styles.count}>
          {selectedCount} of {items.length} selected
        </Text>
        <View style={styles.toolbarActions}>
          <Pressable onPress={props.onSelectAll} hitSlop={10}>
            <Text style={styles.action}>Select all</Text>
          </Pressable>
          <Pressable onPress={props.onSelectNone} hitSlop={10}>
            <Text style={styles.action}>None</Text>
          </Pressable>
        </View>
      </View>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.amber} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No contacts found on this device.</Text>}
        />
      )}
      <View style={styles.footer}>
        {outcome ? <OutcomeBanner outcome={outcome} /> : null}
        <Pressable
          style={[styles.primaryButton, (busy || selectedCount === 0) && styles.disabled]}
          onPress={() => props.onSubmit()}
          disabled={busy || selectedCount === 0}
        >
          {busy ? (
            <ActivityIndicator color={COLORS.ink} />
          ) : (
            <Text style={styles.primaryLabel}>
              Import {selectedCount} contact{selectedCount === 1 ? "" : "s"}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.ink },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomColor: COLORS.seam,
    borderBottomWidth: 1,
  },
  count: { color: COLORS.paper, fontSize: 14, fontWeight: "600" },
  toolbarActions: { flexDirection: "row", gap: 20 },
  action: { color: COLORS.amber, fontSize: 14, fontWeight: "600" },
  list: { paddingHorizontal: 20, paddingBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 48 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.seam,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: { backgroundColor: COLORS.amber, borderColor: COLORS.amber },
  rowName: { flex: 1, color: COLORS.paper, fontSize: 16 },
  empty: { color: COLORS.fog, fontSize: 15, textAlign: "center", paddingVertical: 40 },
  footer: { padding: 20, gap: 12, borderTopColor: COLORS.seam, borderTopWidth: 1 },
  primaryButton: {
    backgroundColor: COLORS.amber,
    borderRadius: 999,
    minHeight: 48,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryLabel: { color: COLORS.ink, fontSize: 16, fontWeight: "600" },
  disabled: { opacity: 0.5 },
  done: { color: COLORS.paper, fontSize: 14, lineHeight: 20, textAlign: "center" },
  error: { color: COLORS.amber, fontSize: 14, lineHeight: 20, textAlign: "center" },
});
