import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "@/utils/constants";

import type { ScanOutcome } from "@/types";

/** Post-scan feedback: who was saved and which pipeline did the work. */
export function ResultBanner({ outcome }: { outcome: ScanOutcome }): React.JSX.Element {
  if (outcome.kind === "error") {
    return (
      <View style={styles.banner}>
        <Text style={styles.errorText}>{outcome.message}</Text>
      </View>
    );
  }
  const pathLabel = outcome.path === "on-device" ? "on-device OCR" : "photo scan";
  const viaLabel = outcome.via === "ai" ? "AI parse" : "offline parse";
  return (
    <View style={styles.banner}>
      <Text style={styles.savedName}>Saved: {outcome.name}</Text>
      <Text style={styles.meta}>
        {pathLabel} · {viaLabel} · {outcome.seconds.toFixed(1)}s
      </Text>
      {outcome.notice ? <Text style={styles.notice}>{outcome.notice}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: COLORS.panel,
    borderColor: COLORS.seam,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  savedName: { color: COLORS.amber, fontSize: 17, fontWeight: "600" },
  meta: { color: COLORS.fog, fontSize: 13 },
  notice: { color: COLORS.paper, fontSize: 13, lineHeight: 18 },
  errorText: { color: COLORS.paper, fontSize: 14, lineHeight: 20 },
});
