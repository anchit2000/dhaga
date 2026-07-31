import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AgendaDaySection } from "@/components/calendar-screen/agenda-day";
import { useCalendar } from "@/components/calendar-screen/use-calendar";
import { WriteOutReport } from "@/components/calendar-screen/write-out-report";
import { COLORS } from "@/utils/constants";
import { CALENDAR_PHASE_LABELS } from "@/utils/constants/calendar";

/**
 * This phone's real events and Dhaga's follow-ups, in one list — the mobile
 * answer to "all of my events in one place".
 *
 * The write-out is a button, not a background job: adding a calendar to
 * someone's phone and filling it with reminders is a decision they make, and
 * every run reports exactly what it did.
 */
export function CalendarScreen(): React.JSX.Element {
  const calendar = useCalendar();
  const busy = calendar.phase !== null;
  const view = calendar.view;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={busy} onRefresh={() => void calendar.refresh()} tintColor={COLORS.fog} />
      }
    >
      <Text style={styles.lede}>
        Your phone&apos;s calendar and your Dhaga follow-ups together. Follow-ups you add here go to
        a calendar named Dhaga — never your own calendars, so you can hide or delete it at any time.
      </Text>

      <Pressable
        style={[styles.primaryButton, (busy || !view) && styles.disabled]}
        onPress={() => void calendar.writeOut()}
        disabled={busy || !view}
        accessibilityRole="button"
      >
        {busy ? (
          <ActivityIndicator color={COLORS.ink} />
        ) : (
          <Text style={styles.primaryLabel}>Add follow-ups to this phone</Text>
        )}
      </Pressable>

      {calendar.phase ? (
        <Text style={styles.phase}>{CALENDAR_PHASE_LABELS[calendar.phase]}</Text>
      ) : null}

      {calendar.outcome?.kind === "done" ? <WriteOutReport result={calendar.outcome.result} /> : null}
      {calendar.outcome?.kind === "error" ? (
        <Text style={styles.error}>{calendar.outcome.message}</Text>
      ) : null}
      {calendar.error ? <Text style={styles.error}>{calendar.error}</Text> : null}

      {calendar.denied ? (
        <View style={styles.deniedBlock}>
          <Text style={styles.error}>
            Dhaga needs calendar access to show your events and write follow-ups. Nothing is read or
            written until you allow it.
          </Text>
          {!calendar.denied.canAskAgain ? (
            <Pressable style={styles.secondaryButton} onPress={calendar.openSettings}>
              <Text style={styles.secondaryLabel}>Open Settings</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {view?.followUpError ? <Text style={styles.notice}>{view.followUpError}</Text> : null}

      {view?.unscheduled.length ? (
        <Text style={styles.notice}>
          {view.unscheduled.length} follow-up{view.unscheduled.length === 1 ? "" : "s"} with no due
          date — give them one in Dhaga and they&apos;ll land here.
        </Text>
      ) : null}

      {view && view.agenda.length === 0 && !busy ? (
        <Text style={styles.notice}>Nothing on the calendar for the next few weeks.</Text>
      ) : null}

      {view?.agenda.map((day) => (
        <AgendaDaySection key={day.key} day={day} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.ink },
  content: { padding: 20, gap: 20 },
  lede: { color: COLORS.fog, fontSize: 15, lineHeight: 22 },
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
  deniedBlock: { gap: 12 },
  phase: { color: COLORS.fog, fontSize: 14, textAlign: "center" },
  disabled: { opacity: 0.5 },
  error: { color: COLORS.amber, fontSize: 14, lineHeight: 20 },
  notice: { color: COLORS.fog, fontSize: 14, lineHeight: 20 },
});
