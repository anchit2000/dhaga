import { useState } from "react";

import { renameEvent } from "@/lib/api";

import type { MobileSettings } from "@/types";

/**
 * M2 auto event grouping's one-time prompt (BRD §6.2): shown right after a
 * scan starts a brand-new event ("same geohash, no recent event"), so
 * the placeholder event gets a real name instead of staying "New event".
 * Skipping is fine — the event just keeps its placeholder name.
 */
export function useEventNamePrompt(settings: MobileSettings | null) {
  // Id of a just-created event waiting for its one-time prompt; null the rest of the time.
  const [eventToName, setEventToName] = useState<string | null>(null);

  async function confirmEventName(name: string): Promise<void> {
    if (!settings || !eventToName) return;
    try {
      await renameEvent(settings, eventToName, name);
    } catch {
      // Non-critical: the event keeps its placeholder name; it can still
      // be renamed later from the web app's Events page.
    } finally {
      setEventToName(null);
    }
  }

  function dismissEventPrompt(): void {
    setEventToName(null);
  }

  return { eventToName, setEventToName, confirmEventName, dismissEventPrompt };
}
