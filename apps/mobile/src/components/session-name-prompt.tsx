import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { COLORS } from "@/utils/constants";

/**
 * M2 auto event grouping's one-time prompt (BRD §6.2): shown right after a
 * scan starts a brand-new session ("same geohash, no recent session"), so
 * the placeholder session gets a real name instead of staying "New session".
 * Skipping is fine — the session just keeps its placeholder name.
 */
export function SessionNamePrompt({
  visible,
  onConfirm,
  onSkip,
}: {
  visible: boolean;
  onConfirm: (name: string) => void;
  onSkip: () => void;
}) {
  const [name, setName] = useState("");

  function confirm(): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    setName("");
    onConfirm(trimmed);
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Name this event?</Text>
          <Text style={styles.subtitle}>
            You&apos;re at a new place — give this session a name to keep who you meet here together.
          </Text>
          <TextInput
            autoFocus
            value={name}
            onChangeText={setName}
            placeholder="Web Summit 2026"
            placeholderTextColor={COLORS.fog}
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={confirm}
          />
          <View style={styles.actions}>
            <Pressable style={styles.skipButton} onPress={onSkip}>
              <Text style={styles.skipLabel}>Skip</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmButton, !name.trim() && styles.confirmButtonDisabled]}
              onPress={confirm}
              disabled={!name.trim()}
            >
              <Text style={styles.confirmLabel}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(13, 11, 9, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: COLORS.panel,
    borderColor: COLORS.seam,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  title: { color: COLORS.paper, fontSize: 18, fontWeight: "600" },
  subtitle: { color: COLORS.fog, fontSize: 14, lineHeight: 20 },
  input: {
    color: COLORS.paper,
    fontSize: 16,
    backgroundColor: COLORS.panel2,
    borderColor: COLORS.seam,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 4 },
  skipButton: { minHeight: 44, paddingHorizontal: 16, justifyContent: "center" },
  skipLabel: { color: COLORS.fog, fontSize: 15 },
  confirmButton: {
    backgroundColor: COLORS.amber,
    borderRadius: 999,
    minHeight: 44,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  confirmButtonDisabled: { opacity: 0.4 },
  confirmLabel: { color: COLORS.ink, fontSize: 15, fontWeight: "600" },
});
