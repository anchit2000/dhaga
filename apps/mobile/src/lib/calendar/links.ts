import { File, Paths } from "expo-file-system";

import { CALENDAR_LINKS_FILE } from "@/utils/constants/calendar";

import type { CalendarLinks } from "./types";

/**
 * followUpId → the device event Dhaga wrote for it, persisted to a
 * document-directory JSON file (same convention as pending-capture.json and
 * voice-vocab.json: whole map rewritten atomically, missing/corrupt treated as
 * empty).
 *
 * This is the mobile stand-in for the web's calendar_event_links table, and it
 * is what makes the write-out idempotent: it is the only record that an event
 * on the Dhaga calendar belongs to a particular follow-up. Lose it and the next
 * run cannot recognise its own writes — it would create a second event for
 * every follow-up and orphan the first.
 */
const linksFile = new File(Paths.document, CALENDAR_LINKS_FILE);

export async function loadCalendarLinks(): Promise<CalendarLinks> {
  try {
    if (!linksFile.exists) return {};
    const parsed: unknown = JSON.parse(await linksFile.text());
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const links: CalendarLinks = {};
    // Filtered rather than cast: a hand-edited or half-written file must not
    // put a non-string where an event id is expected and blow up a later write.
    for (const [followUpId, eventId] of Object.entries(parsed)) {
      if (typeof eventId === "string" && eventId) links[followUpId] = eventId;
    }
    return links;
  } catch {
    return {};
  }
}

export function saveCalendarLinks(links: CalendarLinks): void {
  try {
    if (Object.keys(links).length === 0) {
      if (linksFile.exists) linksFile.delete();
      return;
    }
    linksFile.write(JSON.stringify(links));
  } catch {
    // Best-effort: a failed persist means the next run re-creates these events
    // rather than updating them. Loud in the code, invisible to the user — the
    // alternative (failing the whole run) loses work that already succeeded.
  }
}
