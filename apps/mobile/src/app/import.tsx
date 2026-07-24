import { Pressable, StyleSheet, Text, View } from "react-native";

import { ContactPicker } from "@/components/contact-import/contact-picker";
import { useContactImport } from "@/components/contact-import/use-contact-import";
import { COLORS } from "@/utils/constants";

export default function ImportScreen(): React.JSX.Element {
  const im = useContactImport();

  if (!im.permission?.granted) {
    const canAsk = !im.permission || im.permission.canAskAgain;
    return (
      <View style={styles.gate}>
        <Text style={styles.lede}>
          Import people you already know from this phone. Nothing is read until you allow it, and only
          the contacts you pick are sent to your Dhaga server.
        </Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => void (canAsk ? im.requestAndLoad() : im.openSettings())}
        >
          <Text style={styles.primaryLabel}>{canAsk ? "Allow contacts access" : "Open Settings"}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ContactPicker
      items={im.items}
      selected={im.selected}
      selectedCount={im.selectedCount}
      loading={im.loading}
      busy={im.busy}
      outcome={im.outcome}
      onToggle={im.toggle}
      onSelectAll={im.selectAll}
      onSelectNone={im.selectNone}
      onSubmit={() => void im.submit()}
    />
  );
}

const styles = StyleSheet.create({
  gate: {
    flex: 1,
    backgroundColor: COLORS.ink,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 20,
  },
  lede: { color: COLORS.fog, fontSize: 15, lineHeight: 22, textAlign: "center" },
  primaryButton: {
    backgroundColor: COLORS.amber,
    borderRadius: 999,
    minHeight: 48,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryLabel: { color: COLORS.ink, fontSize: 16, fontWeight: "600" },
});
