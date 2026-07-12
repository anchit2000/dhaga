import { useState } from "react";

import { renameSession } from "@/lib/api";

import type { MobileSettings } from "@/types";

/**
 * M2 auto event grouping's one-time prompt (BRD §6.2): shown right after a
 * scan starts a brand-new session ("same geohash, no recent session"), so
 * the placeholder session gets a real name instead of staying "New session".
 * Skipping is fine — the session just keeps its placeholder name.
 */
export function useSessionNamePrompt(settings: MobileSettings | null) {
  // Id of a just-created session waiting for its one-time prompt; null the rest of the time.
  const [sessionToName, setSessionToName] = useState<string | null>(null);

  async function confirmSessionName(name: string): Promise<void> {
    if (!settings || !sessionToName) return;
    try {
      await renameSession(settings, sessionToName, name);
    } catch {
      // Non-critical: the session keeps its placeholder name; it can still
      // be renamed later from the web app's Sessions page.
    } finally {
      setSessionToName(null);
    }
  }

  function dismissSessionPrompt(): void {
    setSessionToName(null);
  }

  return { sessionToName, setSessionToName, confirmSessionName, dismissSessionPrompt };
}
