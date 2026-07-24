import { useCallback } from "react";
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";

import { AdvocateCard } from "@/components/referral-screen/advocate-card";
import { useReferral } from "@/components/referral-screen/use-referral";
import { COLORS } from "@/utils/constants";

import type { ReferralInfo } from "@/types";

export default function ReferralScreen(): React.JSX.Element {
  const { referral, loaded, error, retry } = useReferral();

  const onShare = useCallback(async (info: ReferralInfo): Promise<void> => {
    try {
      // The link rides in the message body too, so it survives on Android
      // (where Share ignores the separate `url` field).
      await Share.share({
        message: `Join me on Dhaga, a private AI-native personal CRM. ${info.inviteUrl}`,
        url: info.inviteUrl,
      });
    } catch {
      // Dismissed or unavailable — nothing to surface, nothing to log.
    }
  }, []);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {!loaded && !error ? (
          <View style={styles.centered}>
            <ActivityIndicator color={COLORS.amber} />
          </View>
        ) : error && !loaded ? (
          <View style={styles.centered}>
            <Text style={styles.error}>{error}</Text>
            <Pressable style={styles.retry} onPress={retry} hitSlop={10}>
              <Text style={styles.retryLabel}>Try again</Text>
            </Pressable>
          </View>
        ) : referral ? (
          <AdvocateCard referral={referral} onShare={() => void onShare(referral)} />
        ) : (
          <View style={styles.centered}>
            <Text style={styles.unavailable}>Referrals are not available on this server.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.ink },
  content: { padding: 20, gap: 16, flexGrow: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  unavailable: { color: COLORS.fog, fontSize: 15, lineHeight: 22, textAlign: "center" },
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
});
