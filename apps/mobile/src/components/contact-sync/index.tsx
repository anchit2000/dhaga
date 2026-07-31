import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { SyncReport } from "@/components/contact-sync/sync-report";
import { useContactSync } from "@/components/contact-sync/use-contact-sync";
import { COLORS } from "@/utils/constants";
import { SYNC_PHASE_LABELS } from "@/utils/constants/sync";

/**
 * Two-way contact sync, on demand. Everything the run learned — including the
 * container caveats and any conflict the server could not resolve — is shown
 * here; nothing is retried or resolved behind the user's back.
 */
export function ContactSyncScreen(): React.JSX.Element {
  const sync = useContactSync();
  const busy = sync.phase !== null;
  const denied = sync.outcome?.kind === "denied" ? sync.outcome : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.lede}>
        Match this phone&apos;s address book with Dhaga, both ways. Dhaga only touches the fields it
        manages — names, jobs, emails, phones, links, addresses and dates — and leaves everything
        else on your contacts alone.
      </Text>

      <Pressable
        style={styles.toggleRow}
        onPress={() => sync.setPushUnlinked(!sync.pushUnlinked)}
        disabled={busy}
        accessibilityRole="switch"
        accessibilityState={{ checked: sync.pushUnlinked, disabled: busy }}
      >
        <View style={styles.toggleText}>
          <Text style={styles.toggleLabel}>Add Dhaga-only contacts to this phone</Text>
          <Text style={styles.toggleHint}>
            Copies people you added in Dhaga but don&apos;t have on this phone into your address
            book. Contacts you imported from a file or another account stay in Dhaga.
          </Text>
        </View>
        <Switch
          value={sync.pushUnlinked}
          onValueChange={sync.setPushUnlinked}
          disabled={busy}
          trackColor={{ false: COLORS.seam, true: COLORS.amber }}
        />
      </Pressable>

      <Pressable
        style={[styles.primaryButton, busy && styles.disabled]}
        onPress={() => void sync.run()}
        disabled={busy || !sync.ready}
        accessibilityRole="button"
      >
        {busy ? (
          <ActivityIndicator color={COLORS.ink} />
        ) : (
          <Text style={styles.primaryLabel}>Sync contacts</Text>
        )}
      </Pressable>

      {sync.phase ? (
        <Text style={styles.phase}>
          {SYNC_PHASE_LABELS[sync.phase]}
          {/* A big address book goes up in several requests; say so, or a long
              sync looks like a stuck one. */}
          {sync.progress ? ` (batch ${sync.progress.chunk} of ${sync.progress.total})` : ""}
        </Text>
      ) : null}

      {sync.outcome?.kind === "done" ? <SyncReport result={sync.outcome.result} /> : null}
      {sync.outcome?.kind === "error" ? (
        <Text style={styles.error}>{sync.outcome.message}</Text>
      ) : null}
      {denied ? (
        <Text style={styles.error}>
          Dhaga needs contacts access to sync. Nothing is read or written until you allow it.
        </Text>
      ) : null}
      {denied && !denied.canAskAgain ? (
        <Pressable style={styles.secondaryButton} onPress={sync.openSettings}>
          <Text style={styles.secondaryLabel}>Open Settings</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.ink },
  content: { padding: 20, gap: 20 },
  lede: { color: COLORS.fog, fontSize: 15, lineHeight: 22 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    minHeight: 44,
    paddingVertical: 8,
  },
  toggleText: { flex: 1, gap: 4 },
  toggleLabel: { color: COLORS.paper, fontSize: 15, fontWeight: "600" },
  toggleHint: { color: COLORS.fog, fontSize: 13, lineHeight: 19 },
  primaryButton: {
    backgroundColor: COLORS.amber,
    borderRadius: 999,
    minHeight: 48,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryLabel: { color: COLORS.ink, fontSize: 16, fontWeight: "600" },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.seam,
    minHeight: 48,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryLabel: { color: COLORS.paper, fontSize: 15, fontWeight: "600" },
  phase: { color: COLORS.fog, fontSize: 14, textAlign: "center" },
  disabled: { opacity: 0.5 },
  error: { color: COLORS.amber, fontSize: 14, lineHeight: 20 },
});
