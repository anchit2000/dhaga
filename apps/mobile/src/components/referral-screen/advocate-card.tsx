import { Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS } from "@/utils/constants";

import type { ReferralInfo } from "@/types";

interface AdvocateCardProps {
  referral: ReferralInfo;
  onShare: () => void;
}

/** "a free month" reads better than "30 free days" for the common case. */
function rewardCopy(days: number): string {
  return days === 30 ? "a free month" : `${days} free days`;
}

/** The advocate surface: code, invite link, share action and reward counts.
 *  Presentational only — all state lives in useReferral. */
export function AdvocateCard({ referral, onShare }: AdvocateCardProps): React.JSX.Element {
  const reward = rewardCopy(referral.rewardDays);
  return (
    <View style={styles.container}>
      <Text style={styles.lede}>
        Invite a friend to Dhaga. When they subscribe, you both get {reward} of Pro.
      </Text>

      <View style={styles.panel}>
        <Text style={styles.panelLabel}>Your code</Text>
        <Text style={styles.code} selectable>
          {referral.code}
        </Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelLabel}>Invite link</Text>
        <Text style={styles.link} selectable numberOfLines={2}>
          {referral.inviteUrl}
        </Text>
      </View>

      <Pressable style={styles.shareButton} onPress={onShare} accessibilityRole="button">
        <Text style={styles.shareLabel}>Share invite</Text>
      </Pressable>

      <View style={styles.counts}>
        <View style={styles.countTile}>
          <Text style={styles.countValue}>{referral.rewardedCount}</Text>
          <Text style={styles.countLabel}>Rewarded</Text>
        </View>
        <View style={styles.countTile}>
          <Text style={styles.countValue}>{referral.pendingCount}</Text>
          <Text style={styles.countLabel}>Pending</Text>
        </View>
      </View>

      <Text style={styles.footnote}>
        A friend redeems the invite in the web app. Rewards apply once they subscribe to Pro.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  lede: { color: COLORS.fog, fontSize: 15, lineHeight: 22 },
  panel: {
    backgroundColor: COLORS.panel,
    borderColor: COLORS.seam,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  panelLabel: { color: COLORS.fog, fontSize: 12, fontWeight: "600" },
  code: { color: COLORS.amber, fontSize: 24, fontWeight: "800", letterSpacing: 2 },
  link: { color: COLORS.paper, fontSize: 14, lineHeight: 20 },
  shareButton: {
    backgroundColor: COLORS.amber,
    borderRadius: 999,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  shareLabel: { color: COLORS.ink, fontSize: 16, fontWeight: "600" },
  counts: { flexDirection: "row", gap: 12 },
  countTile: {
    flex: 1,
    backgroundColor: COLORS.panel,
    borderColor: COLORS.seam,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  countValue: { color: COLORS.amber, fontSize: 24, fontWeight: "800" },
  countLabel: { color: COLORS.fog, fontSize: 12 },
  footnote: { color: COLORS.fog, fontSize: 13, lineHeight: 18 },
});
