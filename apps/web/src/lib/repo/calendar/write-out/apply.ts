import { getCalendarProvider, type CalendarProvider, type CalendarTokens } from "@dhaga/core";
import type { WriteOutcome, WritePlan, WriteTarget } from "./types";

/** Refresh this far ahead of expiry, matching the read path (../access.ts). */
const REFRESH_SKEW_MS = 60_000;

/**
 * Phase 2 — NETWORK ONLY. No getDb(), no database handle in scope: this is the
 * phase that talks to Google/Microsoft, and it deliberately runs with zero
 * tenant connections checked out. Targets are walked sequentially; one failing
 * calendar is recorded and skipped, never thrown, so a second connection still
 * gets its write.
 */
export async function applyWritePlan(plan: WritePlan): Promise<WriteOutcome[]> {
  const outcomes: WriteOutcome[] = [];
  for (const target of plan.targets) {
    outcomes.push(await applyToTarget(plan, target));
  }
  return outcomes;
}

async function applyToTarget(plan: WritePlan, target: WriteTarget): Promise<WriteOutcome> {
  const base: WriteOutcome = {
    connectionId: target.connectionId,
    linkId: target.linkId,
    externalEventId: target.externalEventId,
    writeCalendarId: null,
    refreshed: null,
    failed: false,
  };
  let provider: CalendarProvider;
  try {
    provider = getCalendarProvider(target.providerId);
  } catch {
    return { ...base, failed: true };
  }
  if (!provider.ensureWriteCalendar || !provider.upsertEvent || !provider.deleteEvent) {
    return base;
  }
  try {
    const { accessToken, refreshed } = await freshToken(provider, target);
    if (!accessToken) return { ...base, failed: true };

    const existingEventId = target.externalEventId;
    // Nothing to place and nothing placed before: no calendar call at all.
    if (!plan.event && !existingEventId) return { ...base, refreshed };

    const calendarId = await provider.ensureWriteCalendar({
      accessToken,
      calendarId: target.writeCalendarId,
    });

    // Done / dismissed / undated: remove what we wrote. Deleting an event that
    // is already gone resolves quietly, so this is safe to repeat.
    if (!plan.event) {
      if (existingEventId) {
        await provider.deleteEvent({ accessToken, calendarId, externalEventId: existingEventId });
      }
      return { ...base, externalEventId: null, writeCalendarId: calendarId, refreshed };
    }

    const externalEventId = await provider.upsertEvent({
      accessToken,
      calendarId,
      externalEventId: target.externalEventId,
      event: plan.event,
    });
    return { ...base, externalEventId, writeCalendarId: calendarId, refreshed };
  } catch {
    // Never log the error body — provider responses can echo event content.
    return { ...base, failed: true };
  }
}

/** Refresh in-flight when the stored token is at/near expiry. The connection's
 *  STORED scope is passed through so a provider that re-sends scopes on refresh
 *  cannot narrow an upgraded connection back to free/busy. */
async function freshToken(
  provider: CalendarProvider,
  target: WriteTarget,
): Promise<{ accessToken: string | null; refreshed: CalendarTokens | null }> {
  const nearExpiry =
    target.expiresAt !== null && target.expiresAt.getTime() <= Date.now() + REFRESH_SKEW_MS;
  if (!nearExpiry || !target.refreshToken) {
    return { accessToken: target.accessToken, refreshed: null };
  }
  const refreshed = await provider.refresh(target.refreshToken, target.scope);
  if (!refreshed) return { accessToken: null, refreshed: null };
  return { accessToken: refreshed.accessToken, refreshed };
}
