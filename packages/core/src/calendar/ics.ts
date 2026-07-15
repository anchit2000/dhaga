/**
 * "Propose + hand off" booking: we never write to a calendar. Instead we hand
 * the user a standards-compliant invite they drop into their own app — an .ics
 * file (works everywhere, incl. Apple Calendar) or a Google/Outlook deep link.
 * Pure string builders, no I/O; `dtstamp` defaults to `start` for deterministic
 * output under test.
 */

/** Compact UTC stamp per RFC 5545: 20260715T143000Z. */
function toUtcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Escape TEXT values per RFC 5545 §3.3.11 (backslash first). */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function buildIcs(params: {
  uid: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  dtstamp?: Date;
}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dhaga//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeText(params.uid)}`,
    `DTSTAMP:${toUtcStamp(params.dtstamp ?? params.start)}`,
    `DTSTART:${toUtcStamp(params.start)}`,
    `DTEND:${toUtcStamp(params.end)}`,
    `SUMMARY:${escapeText(params.title)}`,
  ];
  if (params.description) lines.push(`DESCRIPTION:${escapeText(params.description)}`);
  if (params.location) lines.push(`LOCATION:${escapeText(params.location)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

export function buildAddToCalendarLinks(params: {
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
}): { google: string; outlook: string } {
  const google = new URL("https://calendar.google.com/calendar/render");
  google.searchParams.set("action", "TEMPLATE");
  google.searchParams.set("text", params.title);
  google.searchParams.set("dates", `${toUtcStamp(params.start)}/${toUtcStamp(params.end)}`);
  if (params.description) google.searchParams.set("details", params.description);
  if (params.location) google.searchParams.set("location", params.location);

  const outlook = new URL("https://outlook.office.com/calendar/0/deeplink/compose");
  outlook.searchParams.set("path", "/calendar/action/compose");
  outlook.searchParams.set("rru", "addevent");
  outlook.searchParams.set("subject", params.title);
  outlook.searchParams.set("startdt", params.start.toISOString());
  outlook.searchParams.set("enddt", params.end.toISOString());
  if (params.description) outlook.searchParams.set("body", params.description);
  if (params.location) outlook.searchParams.set("location", params.location);

  return { google: google.toString(), outlook: outlook.toString() };
}
