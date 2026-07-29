import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DemoCalendarProvider,
  GoogleCalendarProvider,
  MicrosoftCalendarProvider,
  connectionCapabilities,
  type CalendarProvider,
} from "@dhaga/core";

/**
 * Capability derivation is the safety property of the whole M2 upgrade: a
 * connection made for free/busy must KEEP working for free/busy and must never
 * silently start having its event details read or written to. There is no
 * capability column — the tier is read off the scope the user actually granted,
 * so the only way to gain it is to re-consent, which rewrites that scope.
 *
 * These tests pin the exact scope strings that already exist in production
 * connection rows. If someone broadens a default scope constant, or adds a
 * read-implying token to a provider's derivation, a test here fails.
 */

/** The scope string every Google connection made before M2 carries. */
const GOOGLE_EXISTING_SCOPE =
  "openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/calendar.freebusy";
const GOOGLE_UPGRADED_SCOPE =
  "openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/calendar.freebusy https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.app.created";
/** The scope string every Microsoft connection made before M2 carries. */
const MICROSOFT_EXISTING_SCOPE =
  "openid email offline_access https://graph.microsoft.com/Calendars.Read";
const MICROSOFT_UPGRADED_SCOPE =
  "openid email offline_access https://graph.microsoft.com/Calendars.ReadWrite";

describe("connectionCapabilities — existing connections are never upgraded behind the user", () => {
  it("leaves a pre-M2 Google free/busy connection at free/busy", () => {
    expect(connectionCapabilities(new GoogleCalendarProvider(), GOOGLE_EXISTING_SCOPE)).toEqual({
      readEvents: false,
      writeEvents: false,
    });
  });

  it("leaves a pre-M2 Microsoft Calendars.Read connection at free/busy", () => {
    // Calendars.Read technically permits event reads, but every existing
    // connection holds it WITHOUT having opted in — so it must not count.
    expect(
      connectionCapabilities(new MicrosoftCalendarProvider(), MICROSOFT_EXISTING_SCOPE),
    ).toEqual({ readEvents: false, writeEvents: false });
  });

  it("treats a missing scope as free/busy rather than guessing", () => {
    expect(connectionCapabilities(new GoogleCalendarProvider(), null)).toEqual({
      readEvents: false,
      writeEvents: false,
    });
    expect(connectionCapabilities(new MicrosoftCalendarProvider(), null)).toEqual({
      readEvents: false,
      writeEvents: false,
    });
  });

  it("treats a provider that does not derive at all as free/busy", () => {
    // The demo provider implements listBusy only; nothing may be read or
    // written through it however its scope string happens to look.
    expect(connectionCapabilities(new DemoCalendarProvider(), "demo.freebusy")).toEqual({
      readEvents: false,
      writeEvents: false,
    });
  });
});

describe("connectionCapabilities — the opt-in upgrade grants exactly the new tier", () => {
  it("gives an upgraded Google connection event reads and Dhaga-calendar writes", () => {
    expect(connectionCapabilities(new GoogleCalendarProvider(), GOOGLE_UPGRADED_SCOPE)).toEqual({
      readEvents: true,
      writeEvents: true,
    });
  });

  it("gives an upgraded Microsoft connection event reads and Dhaga-calendar writes", () => {
    expect(
      connectionCapabilities(new MicrosoftCalendarProvider(), MICROSOFT_UPGRADED_SCOPE),
    ).toEqual({ readEvents: true, writeEvents: true });
  });
});

describe("connectionCapabilities — a capability is never reported without the method behind it", () => {
  const capableScope = "https://www.googleapis.com/auth/calendar.app.created";

  it("reports writeEvents false when the provider cannot actually write", () => {
    // A community provider could derive a write capability from a scope while
    // implementing none of the write methods; callers must not then try.
    const halfBuilt: CalendarProvider = {
      id: "half-built",
      label: "Half built",
      isConfigured: () => true,
      getAuthUrl: () => "https://example.test/auth",
      exchangeCode: () => Promise.reject(new Error("not used")),
      refresh: async () => null,
      listBusy: async () => [],
      capabilitiesFromScope: () => ({ readEvents: true, writeEvents: true }),
      listEvents: async () => [],
    };
    expect(connectionCapabilities(halfBuilt, capableScope)).toEqual({
      readEvents: true,
      writeEvents: false,
    });
  });
});

describe("a free/busy-only connection is never asked for events", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not call listEvents for a connection whose scope is free/busy only", async () => {
    const provider = new GoogleCalendarProvider();
    const listEvents = vi.spyOn(provider, "listEvents");
    const range = { from: new Date("2026-07-01T00:00:00Z"), to: new Date("2026-08-01T00:00:00Z") };

    // This is the gate every event read goes through (repo/calendar/events.ts).
    if (connectionCapabilities(provider, GOOGLE_EXISTING_SCOPE).readEvents) {
      await provider.listEvents?.({ accessToken: "token", range });
    }
    expect(listEvents).not.toHaveBeenCalled();
  });
});
