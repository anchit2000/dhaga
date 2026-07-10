import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS } from "@/utils/constants";

/**
 * LinkedIn QR capture (docs/ideas.md; checklist.md's "LinkedIn QR format
 * support", v1.4): shown when the camera reads a LinkedIn profile QR code.
 * Confirms before leaving the app (same posture as SessionNamePrompt) —
 * "Add contact" opens the web app's existing Add person form in the
 * browser, prefilled; this component never saves anything itself.
 */
export function LinkedInQrPrompt({
  url,
  error,
  onOpen,
  onDismiss,
}: {
  url: string | null;
  error: string | null;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  return (
    <Modal visible={url != null} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>LinkedIn profile found</Text>
          <Text style={styles.subtitle}>
            Open Dhaga&apos;s Add person form in your browser with this link filled in — you
            choose the name and save it yourself.
          </Text>
          <Text style={styles.url} numberOfLines={1} ellipsizeMode="middle">
            {url}
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Pressable style={styles.skipButton} onPress={onDismiss}>
              <Text style={styles.skipLabel}>Not now</Text>
            </Pressable>
            <Pressable style={styles.confirmButton} onPress={onOpen}>
              <Text style={styles.confirmLabel}>Add contact</Text>
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
  url: { color: COLORS.amber, fontSize: 13, fontFamily: "monospace" },
  error: { color: COLORS.paper, fontSize: 13 },
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
  confirmLabel: { color: COLORS.ink, fontSize: 15, fontWeight: "600" },
});
