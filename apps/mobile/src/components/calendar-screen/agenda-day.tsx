import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "@/utils/constants";
import { AGENDA_DAY_FORMAT, AGENDA_TIME_FORMAT } from "@/utils/constants/calendar";

import type { AgendaDay, AgendaItem } from "@/lib/calendar";

/**
 * One day of the agenda. Follow-ups carry the amber rail — they are the thing
 * the user opened Dhaga to act on; the phone's own events sit quieter behind a
 * seam-coloured one, the same two-tier treatment the web board uses.
 */
export function AgendaDaySection({ day }: { day: AgendaDay }): React.JSX.Element {
  return (
    <View style={styles.day}>
      <Text style={styles.dayLabel}>{day.date.toLocaleDateString(undefined, AGENDA_DAY_FORMAT)}</Text>
      {day.items.map((item) => (
        <AgendaRow key={`${item.kind}-${item.id}`} item={item} />
      ))}
    </View>
  );
}

function AgendaRow({ item }: { item: AgendaItem }): React.JSX.Element {
  if (item.kind === "followUp") {
    return (
      <View style={[styles.row, styles.followUpRow]}>
        <Text style={styles.rowTitle}>{item.contactName}</Text>
        <Text style={styles.rowDetail}>{item.action}</Text>
        {item.overdue ? <Text style={styles.overdue}>Overdue</Text> : null}
      </View>
    );
  }
  return (
    <View style={styles.row}>
      <Text style={styles.rowTitle}>{item.title}</Text>
      <Text style={styles.rowDetail}>
        {item.allDay
          ? "All day"
          : `${item.start.toLocaleTimeString(undefined, AGENDA_TIME_FORMAT)} – ${item.end.toLocaleTimeString(undefined, AGENDA_TIME_FORMAT)}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  day: { gap: 8 },
  dayLabel: {
    color: COLORS.fog,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  row: {
    // 44 clears the touch-target floor even though these rows are not yet
    // tappable — the height is what a row has to be when they become so.
    minHeight: 44,
    justifyContent: "center",
    gap: 2,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: COLORS.panel,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.seam,
  },
  followUpRow: { borderLeftColor: COLORS.amber },
  rowTitle: { color: COLORS.paper, fontSize: 15, fontWeight: "600" },
  rowDetail: { color: COLORS.fog, fontSize: 13, lineHeight: 19 },
  overdue: { color: COLORS.amber, fontSize: 12, fontWeight: "600" },
});
