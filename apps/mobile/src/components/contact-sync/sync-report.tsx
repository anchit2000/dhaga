import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "@/utils/constants";
import { CONFLICT_KIND_LABELS } from "@/utils/constants/sync";

import type { SyncRunResult } from "@/lib/sync";

/**
 * What one sync run did, in plain counts. Conflicts and failed writes are
 * rendered in full rather than folded into a success line: a merge the server
 * could not resolve is the one thing the user has to know about, and hiding it
 * would quietly lose an edit they typed.
 */
export function SyncReport({ result }: { result: SyncRunResult }): React.JSX.Element {
  return (
    <View style={styles.wrap}>
      {result.notice ? <Text style={styles.notice}>{result.notice}</Text> : null}
      <Text style={styles.line}>
        Read {result.observed} from{" "}
        {result.container ? result.container.name : "this phone"} · wrote {result.created} new and{" "}
        {result.updated} updated back to it.
      </Text>
      <Text style={styles.line}>
        In Dhaga: {result.createdInDhaga} added, {result.pulled} updated, {result.linked} newly
        linked.
      </Text>
      {result.conflicts.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>
            {result.conflicts.length} contact{result.conflicts.length === 1 ? "" : "s"} need you to
            decide. Dhaga kept the value it had — open Dhaga on the web, then More › Sync
            conflicts, to restore it or keep this phone&apos;s.
          </Text>
          {result.conflicts.map((report) => (
            <Text key={report.contactId} style={styles.detail}>
              {report.contactName}:{" "}
              {report.conflicts
                .map((conflict) => `${conflict.field} ${CONFLICT_KIND_LABELS[conflict.kind]}`)
                .join(", ")}
            </Text>
          ))}
        </View>
      ) : null}
      {result.failures.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>
            {result.failures.length} change{result.failures.length === 1 ? "" : "s"} couldn&apos;t be
            written to this phone.
          </Text>
          {result.failures.map((failure) => (
            <Text key={failure.contactId} style={styles.detail}>
              {failure.message}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  notice: { color: COLORS.amber, fontSize: 14, lineHeight: 20 },
  line: { color: COLORS.paper, fontSize: 15, lineHeight: 22 },
  block: {
    gap: 6,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.seam,
    backgroundColor: COLORS.panel,
  },
  blockTitle: { color: COLORS.paper, fontSize: 14, fontWeight: "600", lineHeight: 20 },
  detail: { color: COLORS.fog, fontSize: 13, lineHeight: 19 },
});
