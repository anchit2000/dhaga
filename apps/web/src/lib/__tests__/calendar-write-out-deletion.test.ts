import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerCalendarProvider, type CalendarProvider } from "@dhaga/core";
import { encryptToken } from "@/lib/crypto/tokens";
import { getDb } from "@/lib/db/request-scope";
import { calendarConnections, calendarEventLinks } from "@/lib/db/schema";
import { loadWritePlan } from "@/lib/repo/calendar/write-out/db";

const unregister: Array<() => void> = [];

describe("hard-deleted follow-up calendar cleanup", () => {
  afterEach(() => {
    while (unregister.length) unregister.pop()?.();
    vi.unstubAllEnvs();
  });

  it("keeps a deletion plan after the Dhaga follow-up row is gone", async () => {
    vi.stubEnv("CALENDAR_TOKEN_SECRET", "calendar-cleanup-test-secret");
    const providerId = `missing-${randomUUID()}`;
    const provider: CalendarProvider = {
      id: providerId,
      label: providerId,
      isConfigured: () => true,
      getAuthUrl: () => "https://example.test/auth",
      exchangeCode: () => Promise.reject(new Error("not used")),
      refresh: async () => null,
      listBusy: async () => [],
      listEvents: async () => [],
      capabilitiesFromScope: () => ({ readEvents: true, writeEvents: true }),
      ensureWriteCalendar: async () => "dhaga-cal",
      upsertEvent: async () => "event-new",
      deleteEvent: async () => undefined,
    };
    unregister.push(registerCalendarProvider(provider));
    const db = await getDb();
    const connectionId = randomUUID();
    const followUpId = randomUUID();
    const linkId = randomUUID();
    await db.insert(calendarConnections).values({
      id: connectionId, provider: providerId, accessToken: encryptToken("access"),
      scope: "write", status: "connected", writeCalendarId: "dhaga-cal", writeEnabled: true,
    });
    await db.insert(calendarEventLinks).values({
      id: linkId, connectionId, followUpId, externalEventId: "event-orphaned",
    });
    try {
      const loaded = await loadWritePlan(followUpId);
      const target = loaded.targets.find((item) => item.connectionId === connectionId);
      // WHY: reprocessing deletes the derived row first, but this durable link
      // must retain enough information to remove the provider event afterward.
      expect(loaded.event).toBeNull();
      expect(target).toMatchObject({ linkId, externalEventId: "event-orphaned" });
    } finally {
      await db.delete(calendarEventLinks).where(eq(calendarEventLinks.id, linkId));
      await db.delete(calendarConnections).where(eq(calendarConnections.id, connectionId));
    }
  });
});
