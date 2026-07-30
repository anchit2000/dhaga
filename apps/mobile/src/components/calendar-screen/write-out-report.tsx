import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "@/utils/constants";

import type { CalendarWriteResult } from "@/lib/calendar";

/**
 * What the write-out actually did. Counts are shown even when they are zero and
 * failures are shown even though they are embarrassing: a run that says nothing
 * about the events it could not write has told the user it succeeded (CLAUDE.md
 * Rule 12). Mirrors SyncReport on the contact-sync screen.
 */
export function WriteOutReport({ result }: { result: CalendarWriteResult }): React.JSX.Element {
  return (
    <View style={styles.card}>
      <Text style={styles.line}>
        {result.created} added · {result.updated} updated · {result.removed} removed
      </Text>
      {result.failed > 0 ? (
        <Text style={styles.failed}>
          {result.failed} couldn&apos;t be written to the calendar. Tap again to retry them.
        </Text>
      ) : null}
      {result.notice ? <Text style={styles.notice}>{result.notice}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderColor: COLORS.seam,
  },
  line: { color: COLORS.paper, fontSize: 15, fontWeight: "600" },
  failed: { color: COLORS.amber, fontSize: 13, lineHeight: 19 },
  notice: { color: COLORS.fog, fontSize: 13, lineHeight: 19 },
});
