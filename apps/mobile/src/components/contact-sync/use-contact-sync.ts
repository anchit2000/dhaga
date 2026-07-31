import { useCallback, useState } from "react";
import { Linking } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { runContactSync } from "@/lib/sync";
import { isConfigured, loadSettings } from "@/lib/settings";

import type { SyncOutcome, SyncPhase, SyncProgress } from "@/lib/sync";
import type { MobileSettings } from "@/types";

/**
 * State behind the contact-sync screen. Nothing is read from or written to the
 * address book until the user taps Sync — like import, this is user-triggered,
 * never a background job (CLAUDE.md: no silent data collection).
 */
export function useContactSync(): {
  ready: boolean;
  phase: SyncPhase | null;
  /** Which push chunk is in flight, or null when the run needs only one. */
  progress: SyncProgress | null;
  outcome: SyncOutcome | null;
  pushUnlinked: boolean;
  setPushUnlinked: (value: boolean) => void;
  run: () => Promise<void>;
  openSettings: () => void;
} {
  const [settings, setSettings] = useState<MobileSettings | null>(null);
  const [phase, setPhase] = useState<SyncPhase | null>(null);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [outcome, setOutcome] = useState<SyncOutcome | null>(null);
  // On by default: a person added in Dhaga should be reachable from the phone,
  // which is the whole point of syncing the phone's OWN address book. The
  // server keeps that promise narrow — only contacts the user authored in
  // Dhaga, never AI-inferred stubs and never rows that came from an import —
  // so switching it on does not replay every list they ever uploaded onto the
  // handset. Connected Google/Outlook accounts stay opt-in
  // (contact_connections.push_unlinked): writing into someone's cloud account
  // reaches every device signed into it and is a different kind of decision.
  const [pushUnlinked, setPushUnlinked] = useState(true);

  useFocusEffect(
    useCallback(() => {
      void loadSettings().then((loaded) => {
        if (isConfigured(loaded)) setSettings(loaded);
        else router.replace("/setup");
      });
    }, []),
  );

  const run = useCallback(async (): Promise<void> => {
    if (!settings || phase !== null) return;
    setOutcome(null);
    setPhase("permission");
    try {
      setOutcome(
        await runContactSync(
          settings,
          (next, at) => {
            setPhase(next);
            // Cleared by every phase that reports none, so "batch 3 of 7" can
            // never linger over a later step it does not describe.
            setProgress(at ?? null);
          },
          pushUnlinked,
        ),
      );
    } finally {
      setPhase(null);
      setProgress(null);
    }
  }, [settings, phase, pushUnlinked]);

  const openSettings = useCallback((): void => void Linking.openSettings(), []);

  return {
    ready: settings !== null,
    phase,
    progress,
    outcome,
    pushUnlinked,
    setPushUnlinked,
    run,
    openSettings,
  };
}
