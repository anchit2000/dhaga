import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "@/utils/constants";

import type { WrappedStats } from "@/types";

interface WrappedCardProps {
  stats: WrappedStats;
}

/**
 * The branded, shareable "network in review" card. Renders COUNTS and the top
 * cluster CATEGORY only — never a person's name (the reveal-gated `reveal`
 * field is deliberately not read here; see the wrapped.ts contract). Purely
 * presentational.
 */
export function WrappedCard({ stats }: WrappedCardProps): React.JSX.Element {
  const tiles: ReadonlyArray<{ label: string; value: number }> = [
    { label: "Network size", value: stats.totalNetwork },
    { label: "Events", value: stats.eventsAttended },
    { label: "Overdue follow-ups", value: stats.overdueFollowUps },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>DHAGA · IN REVIEW</Text>
      <Text style={styles.scope}>{stats.scopeLabel}</Text>

      <View style={styles.hero}>
        <Text style={styles.heroValue}>{stats.newPeople}</Text>
        <Text style={styles.heroLabel}>new people met</Text>
      </View>

      <View style={styles.grid}>
        {tiles.map((tile) => (
          <View key={tile.label} style={styles.tile}>
            <Text style={styles.tileValue}>{tile.value}</Text>
            <Text style={styles.tileLabel}>{tile.label}</Text>
          </View>
        ))}
      </View>

      {stats.topCluster ? (
        <View style={styles.cluster}>
          <Text style={styles.clusterLabel}>Biggest cluster</Text>
          <Text style={styles.clusterValue} numberOfLines={1}>
            {stats.topCluster.key} · {stats.topCluster.count}
          </Text>
        </View>
      ) : null}

      <Text style={styles.footer}>dhaga — your network, in review</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.panel,
    borderColor: COLORS.seam,
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    gap: 20,
  },
  kicker: { color: COLORS.amber, fontSize: 11, fontWeight: "700", letterSpacing: 2 },
  scope: { color: COLORS.paper, fontSize: 22, fontWeight: "700", marginTop: -12 },
  hero: { gap: 2 },
  heroValue: { color: COLORS.amber, fontSize: 56, fontWeight: "800", lineHeight: 60 },
  heroLabel: { color: COLORS.fog, fontSize: 15 },
  grid: { flexDirection: "row", gap: 12 },
  tile: { flex: 1, gap: 4 },
  tileValue: { color: COLORS.paper, fontSize: 22, fontWeight: "700" },
  tileLabel: { color: COLORS.fog, fontSize: 12, lineHeight: 16 },
  cluster: {
    borderTopColor: COLORS.seam,
    borderTopWidth: 1,
    paddingTop: 16,
    gap: 4,
  },
  clusterLabel: { color: COLORS.fog, fontSize: 12 },
  clusterValue: { color: COLORS.paper, fontSize: 18, fontWeight: "700" },
  footer: { color: COLORS.fog, fontSize: 12 },
});
