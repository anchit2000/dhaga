import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { COLORS } from "@/utils/constants";

/**
 * Typed capture — the same review screen voice dictation will eventually fill
 * in-place (BRD §6.3 mobile STT is a separate fast-follow); today the mic
 * action just lands here with a clear "coming soon" hint instead of faking it.
 */
export function TextCaptureView({
  value,
  onChangeText,
  onSubmit,
  busy,
  hint,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  busy: boolean;
  hint: string | null;
}) {
  return (
    <View style={styles.screen}>
      <TextInput
        multiline
        autoFocus
        value={value}
        onChangeText={onChangeText}
        placeholder={"Type anything with a person in it —\nan email signature, card text, a LinkedIn intro…"}
        placeholderTextColor={COLORS.fog}
        style={styles.input}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <Pressable
        style={[styles.sendButton, (!value.trim() || busy) && styles.sendButtonDisabled]}
        onPress={onSubmit}
        disabled={!value.trim() || busy}
      >
        {busy ? <ActivityIndicator color={COLORS.ink} /> : <Text style={styles.sendLabel}>Save contact</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.ink, padding: 20, gap: 16 },
  input: {
    flex: 1,
    color: COLORS.paper,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: "top",
    backgroundColor: COLORS.panel,
    borderColor: COLORS.seam,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  hint: { color: COLORS.fog, fontSize: 13, lineHeight: 18 },
  sendButton: {
    backgroundColor: COLORS.amber,
    borderRadius: 999,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { opacity: 0.4 },
  sendLabel: { color: COLORS.ink, fontSize: 16, fontWeight: "600" },
});
