import { useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ScopeChips } from "@/components/wrapped-screen/scope-chips";
import { useWrapped } from "@/components/wrapped-screen/use-wrapped";
import { WrappedCard } from "@/components/wrapped-screen/wrapped-card";
import { COLORS } from "@/utils/constants";
import { WRAPPED_SCOPE_OPTIONS } from "@/utils/constants/growth";

import type { WrappedStats } from "@/types";

/**
 * A contact-free share caption: counts + top cluster CATEGORY only, plus the
 * public share URL (included in the body so it survives on Android, where
 * Share ignores the separate `url` field).
 */
function buildShareMessage(stats: WrappedStats, shareUrl: string): string {
  const cluster = stats.topCluster ? ` Biggest cluster: ${stats.topCluster.key}.` : "";
  return (
    `My network in review — ${stats.scopeLabel}: ${stats.newPeople} new people, ` +
    `${stats.totalNetwork} in my network, ${stats.eventsAttended} events.${cluster} ` +
    `Made with Dhaga. ${shareUrl}`
  );
}

export default function WrappedScreen(): React.JSX.Element {
  const { scopeKind, data, loading, error, selectScope, retry } = useWrapped();

  const onShare = useCallback(async (): Promise<void> => {
    if (!data) return;
    try {
      await Share.share({
        message: buildShareMessage(data.stats, data.shareUrl),
        url: data.shareUrl,
      });
    } catch {
      // User dismissed the sheet or it's unavailable — nothing to surface,
      // nothing to log (no PII in play).
    }
  }, [data]);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScopeChips
          options={WRAPPED_SCOPE_OPTIONS}
          activeKind={scopeKind}
          disabled={loading}
          onSelect={selectScope}
        />

        {!data && !error ? (
          <View style={styles.centered}>
            <ActivityIndicator color={COLORS.amber} />
          </View>
        ) : error && !data ? (
          <View style={styles.centered}>
            <Text style={styles.error}>{error}</Text>
            <Pressable style={styles.retry} onPress={retry} hitSlop={10}>
              <Text style={styles.retryLabel}>Try again</Text>
            </Pressable>
          </View>
        ) : data && data.stats.totalNetwork === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.empty}>
              Nothing to wrap up yet — capture a few people and check back.
            </Text>
          </View>
        ) : data ? (
          <>
            <WrappedCard stats={data.stats} />
            <Pressable
              style={[styles.shareButton, loading && styles.disabled]}
              onPress={() => void onShare()}
              disabled={loading}
              accessibilityRole="button"
            >
              <Text style={styles.shareLabel}>Share</Text>
            </Pressable>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.ink },
  content: { padding: 20, gap: 20, flexGrow: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  empty: { color: COLORS.fog, fontSize: 15, lineHeight: 22, textAlign: "center" },
  error: { color: COLORS.amber, fontSize: 14, lineHeight: 20, textAlign: "center" },
  retry: {
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.seam,
    alignItems: "center",
    justifyContent: "center",
  },
  retryLabel: { color: COLORS.paper, fontSize: 15, fontWeight: "600" },
  shareButton: {
    backgroundColor: COLORS.amber,
    borderRadius: 999,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.5 },
  shareLabel: { color: COLORS.ink, fontSize: 16, fontWeight: "600" },
});
