// Deep imports, not the ./dates barrel: this module is pulled in by the voice
// session on React Native, where the narrowest possible graph is the point.
import { formatCalendarDate } from "../../dates/important-dates";
import type { CalendarDay } from "../../dates/calendar-day";

/**
 * Every volatile (per-call) prompt that reasons about recency should carry
 * today's date — the model's training cutoff is not "now", and this
 * product constantly judges freshness (job changes, "last touch", relative
 * follow-up timing). This belongs in the user prompt, never the system
 * prompt: system prompts are cached as one stable block (see
 * anthropic-client/shared.ts's cachedSystem()), so a date baked in there
 * would invalidate the cache breakpoint every single day.
 *
 * Deliberately not used by prompts with no temporal judgment to make (e.g.
 * card-scan OCR transcription) — it would just be noise there.
 */

/**
 * WHOSE today? Pass the USER's calendar day (apps/web resolves it from their
 * stored IANA zone via lib/time/zone.ts — core cannot, see ../../dates/calendar-day.ts).
 * It matters: a user in UTC-7 writing "follow up next Tuesday" at 18:00 local is
 * already on the next UTC day, so a UTC "today" makes the model resolve every
 * relative date one day late.
 *
 * Omitting it keeps the previous behaviour EXACTLY — the UTC calendar day, which
 * is also the server-local day wherever this runs (Vercel is UTC) — so callers
 * with no user zone to hand are unchanged rather than silently switched to the
 * runtime's local day.
 */
export function todayLine(today?: CalendarDay): string {
  const date = today ? formatCalendarDate(today) : new Date().toISOString().slice(0, 10);
  return `Today's date: ${date}`;
}
