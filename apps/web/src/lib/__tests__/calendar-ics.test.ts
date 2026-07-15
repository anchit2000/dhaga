import { describe, expect, it } from "vitest";
import { buildAddToCalendarLinks, buildIcs } from "@dhaga/core";

const start = new Date("2026-07-15T14:30:00Z");
const end = new Date("2026-07-15T15:00:00Z");

describe("buildIcs", () => {
  it("emits compact UTC stamps a calendar app can parse", () => {
    const ics = buildIcs({ uid: "abc", title: "Coffee", start, end });
    expect(ics).toContain("DTSTART:20260715T143000Z");
    expect(ics).toContain("DTEND:20260715T150000Z");
    expect(ics).toMatch(/BEGIN:VCALENDAR/);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("escapes commas, semicolons and newlines so a comma in a name can't break the VEVENT", () => {
    const ics = buildIcs({
      uid: "abc",
      title: "Coffee, tea; milk",
      start,
      end,
      description: "line one\nline two",
    });
    expect(ics).toContain("SUMMARY:Coffee\\, tea\\; milk");
    expect(ics).toContain("DESCRIPTION:line one\\nline two");
  });

  it("defaults DTSTAMP to the start instant so output is deterministic", () => {
    const a = buildIcs({ uid: "abc", title: "Coffee", start, end });
    const b = buildIcs({ uid: "abc", title: "Coffee", start, end });
    expect(a).toBe(b);
    expect(a).toContain("DTSTAMP:20260715T143000Z");
  });
});

describe("buildAddToCalendarLinks", () => {
  it("round-trips the title and compact date range into the Google link", () => {
    const { google } = buildAddToCalendarLinks({ title: "Coffee, tea", start, end });
    const url = new URL(google);
    expect(url.searchParams.get("text")).toBe("Coffee, tea");
    expect(url.searchParams.get("dates")).toBe("20260715T143000Z/20260715T150000Z");
  });

  it("uses ISO instants for the Outlook compose link", () => {
    const { outlook } = buildAddToCalendarLinks({ title: "Coffee", start, end });
    const url = new URL(outlook);
    expect(url.searchParams.get("startdt")).toBe("2026-07-15T14:30:00.000Z");
    expect(url.searchParams.get("subject")).toBe("Coffee");
  });
});
