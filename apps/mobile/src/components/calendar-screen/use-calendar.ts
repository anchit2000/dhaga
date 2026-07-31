import { useCallback, useState } from "react";
import { Linking } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { loadCalendarView, writeFollowUpsToDevice } from "@/lib/calendar";
import { isConfigured, loadSettings } from "@/lib/settings";

import type {
  CalendarOutcome,
  CalendarPhase,
  CalendarView,
} from "@/lib/calendar";
import type { MobileSettings } from "@/types";

/**
 * State behind the calendar screen. Two user-triggered actions, never a
 * background job (CLAUDE.md: no silent data collection):
 *  - opening the screen READS this phone's calendar and Dhaga's follow-ups;
 *  - tapping the button WRITES the follow-ups out to the Dhaga calendar.
 *
 * The read is deliberately not allowed to create anything: a user who opens the
 * screen to look at their week must not find a new calendar on their phone
 * afterwards. Only the button adds one.
 */
export function useCalendar(): {
  ready: boolean;
  phase: CalendarPhase | null;
  view: CalendarView | null;
  denied: { canAskAgain: boolean } | null;
  error: string | null;
  outcome: CalendarOutcome | null;
  refresh: () => Promise<void>;
  writeOut: () => Promise<void>;
  openSettings: () => void;
} {
  const [settings, setSettings] = useState<MobileSettings | null>(null);
  const [phase, setPhase] = useState<CalendarPhase | null>(null);
  const [view, setView] = useState<CalendarView | null>(null);
  const [denied, setDenied] = useState<{ canAskAgain: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<CalendarOutcome | null>(null);

  const load = useCallback(async (current: MobileSettings): Promise<void> => {
    setPhase("permission");
    try {
      const result = await loadCalendarView(current, setPhase);
      setDenied(result.kind === "denied" ? { canAskAgain: result.canAskAgain } : null);
      setError(result.kind === "error" ? result.message : null);
      if (result.kind === "ready") setView(result.view);
    } finally {
      setPhase(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSettings().then((loaded) => {
        if (!isConfigured(loaded)) {
          router.replace("/setup");
          return;
        }
        setSettings(loaded);
        void load(loaded);
      });
    }, [load]),
  );

  const refresh = useCallback(async (): Promise<void> => {
    if (settings && phase === null) await load(settings);
  }, [settings, phase, load]);

  const writeOut = useCallback(async (): Promise<void> => {
    if (!view || phase !== null) return;
    setOutcome(null);
    try {
      const result = await writeFollowUpsToDevice(view.followUps, setPhase);
      setOutcome(result);
      // The Dhaga calendar now holds events the agenda must exclude, so the
      // view is stale the moment a write succeeds — reload rather than leave
      // every follow-up showing twice until the user navigates away.
      if (result.kind === "done" && settings) await load(settings);
    } finally {
      setPhase(null);
    }
  }, [view, phase, settings, load]);

  const openSettings = useCallback((): void => void Linking.openSettings(), []);

  return {
    ready: settings !== null,
    phase,
    view,
    denied,
    error,
    outcome,
    refresh,
    writeOut,
    openSettings,
  };
}
