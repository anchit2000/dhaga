import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DemoCalendarProvider,
  followUpToCalendarEvent,
  registerCalendarProvider,
  type CalendarProvider,
  type CalendarWriteEvent,
} from "@dhaga/core";
import { applyWritePlan } from "@/lib/repo/calendar/write-out/apply";
import type { WritePlan, WriteTarget } from "@/lib/repo/calendar/write-out/types";

/**
 * Write-out's promise: a follow-up the user finished or threw away is GONE from
 * their calendar, we only ever touch the Dhaga calendar we created, and a
 * connection that cannot write is never asked to. (The null-event half of the
 * contract lives in calendar-follow-up-event.test.ts.)
 */

const DUE = new Date("2026-08-03T00:00:00Z");
const OPEN_FOLLOW_UP = { contactName: "Ada", action: "Ping", dueDate: DUE, status: "open" };

interface FakeProvider {
  ensureWriteCalendar: ReturnType<typeof vi.fn>;
  upsertEvent: ReturnType<typeof vi.fn>;
  deleteEvent: ReturnType<typeof vi.fn>;
}

function target(overrides: Partial<WriteTarget> = {}): WriteTarget {
  return {
    connectionId: "conn-1",
    providerId: "fake",
    accessToken: "access",
    refreshToken: null,
    expiresAt: null,
    scope: "write",
    writeCalendarId: "dhaga-cal",
    linkId: null,
    externalEventId: null,
    ...overrides,
  };
}

function plan(event: CalendarWriteEvent | null, targets: WriteTarget[]): WritePlan {
  return { followUpId: "fu-1", event, targets };
}

describe("applyWritePlan", () => {
  const registered: Array<() => void> = [];
  afterEach(() => {
    while (registered.length) registered.pop()?.();
    vi.restoreAllMocks();
  });

  /** A fully write-capable provider, registered in the gateway for this test. */
  function register(id: string): FakeProvider {
    const spies = {
      ensureWriteCalendar: vi.fn(async () => "dhaga-cal"),
      upsertEvent: vi.fn(async () => "event-new"),
      deleteEvent: vi.fn(async () => undefined),
    };
    const provider: CalendarProvider = {
      id,
      label: id,
      isConfigured: () => true,
      getAuthUrl: () => "https://example.test/auth",
      exchangeCode: () => Promise.reject(new Error("not used")),
      refresh: async () => null,
      listBusy: async () => [],
      capabilitiesFromScope: () => ({ readEvents: true, writeEvents: true }),
      listEvents: async () => [],
      ...spies,
    };
    registered.push(registerCalendarProvider(provider));
    return spies;
  }

  it("creates the event on the Dhaga calendar, never the primary one", async () => {
    const fake = register("fake");
    const event = followUpToCalendarEvent(OPEN_FOLLOW_UP);
    const [outcome] = await applyWritePlan(plan(event, [target()]));

    expect(fake.ensureWriteCalendar).toHaveBeenCalledWith({
      accessToken: "access",
      calendarId: "dhaga-cal",
    });
    expect(fake.upsertEvent).toHaveBeenCalledWith({
      accessToken: "access",
      calendarId: "dhaga-cal",
      externalEventId: null,
      event,
    });
    expect(fake.deleteEvent).not.toHaveBeenCalled();
    expect(outcome).toMatchObject({ externalEventId: "event-new", failed: false });
  });

  it("deletes the event a completed follow-up left behind, and drops its link", async () => {
    const fake = register("fake");
    const [outcome] = await applyWritePlan(
      plan(null, [target({ linkId: "link-1", externalEventId: "event-old" })]),
    );

    expect(fake.deleteEvent).toHaveBeenCalledWith({
      accessToken: "access",
      calendarId: "dhaga-cal",
      externalEventId: "event-old",
    });
    expect(fake.upsertEvent).not.toHaveBeenCalled();
    // A null id tells the DB phase to delete the link row, so a later change
    // never tries to update an event that no longer exists.
    expect(outcome.externalEventId).toBeNull();
  });

  it("makes no calendar call at all when there is nothing to place and nothing placed", async () => {
    const fake = register("fake");
    const [outcome] = await applyWritePlan(plan(null, [target()]));

    expect(fake.ensureWriteCalendar).not.toHaveBeenCalled();
    expect(fake.upsertEvent).not.toHaveBeenCalled();
    expect(fake.deleteEvent).not.toHaveBeenCalled();
    expect(outcome.failed).toBe(false);
  });

  it("never asks a provider that cannot write to write", async () => {
    // The demo provider implements listBusy only — the free/busy tier.
    registered.push(registerCalendarProvider(new DemoCalendarProvider()));
    const event = followUpToCalendarEvent(OPEN_FOLLOW_UP);
    const [outcome] = await applyWritePlan(plan(event, [target({ providerId: "demo" })]));
    // Not an error — there is simply nothing to do, and nothing to reconnect.
    expect(outcome).toMatchObject({ externalEventId: null, failed: false });
  });

  it("keeps writing to the second calendar when the first one fails", async () => {
    const broken = register("broken");
    broken.upsertEvent.mockRejectedValue(new Error("HTTP 503"));
    const working = register("working");
    const event = followUpToCalendarEvent(OPEN_FOLLOW_UP);

    const outcomes = await applyWritePlan(
      plan(event, [
        target({ connectionId: "conn-broken", providerId: "broken" }),
        target({ connectionId: "conn-ok", providerId: "working" }),
      ]),
    );

    expect(outcomes[0]).toMatchObject({ connectionId: "conn-broken", failed: true });
    expect(outcomes[1]).toMatchObject({ connectionId: "conn-ok", failed: false });
    expect(working.upsertEvent).toHaveBeenCalledTimes(1);
  });
});
