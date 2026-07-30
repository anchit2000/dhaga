import type { UpcomingImportantDate } from "@/lib/repo/reminders";

/** Local to this template, mirroring follow-up-reminder.ts — a 5-line helper, not worth a shared import. */
function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/**
 * `daysUntil` already counts CALENDAR days (see packages/core/dates), so this is
 * a plain lookup — never an hours-based guess that files tomorrow under "today".
 */
function whenPhrase(daysUntil: number): string {
  if (daysUntil <= 0) return "today";
  if (daysUntil === 1) return "tomorrow";
  return `in ${daysUntil} days`;
}

/**
 * "turning 34" reads right for a birthday and wrong for an anniversary, and the
 * label is the only signal we have about which it is (values are free text).
 */
function turningPhrase(label: string, turning: number): string {
  return /birth/i.test(label) ? `turning ${turning}` : `${turning} years`;
}

/**
 * "Important dates coming up" body — pure template, zero AI cost. Lists the
 * scoped user's upcoming birthdays/anniversaries (from
 * listUpcomingImportantDates), linking to the calendar. Contact names and labels
 * are user-derived graph data — imported from address books and card scans — so
 * every one is HTML-escaped, exactly as follow-up-reminder.ts does.
 */
export function importantDateReminderHtml(
  items: UpcomingImportantDate[],
  opts: { appUrl: string },
): string {
  const rows = items
    .map((item) => {
      const age =
        item.turning != null
          ? `<span style="color:#a49a8a;"> — ${escapeHtml(
              turningPhrase(item.label, item.turning),
            )}</span>`
          : "";
      return `<div style="border-left:2px solid #e2a44c;padding:2px 0 2px 12px;margin:0 0 14px;">
        <p style="margin:0;font-size:15px;color:#f3ede2;">
          ${escapeHtml(item.contactName)}'s ${escapeHtml(
            item.label.toLowerCase(),
          )} is <span style="color:#e2a44c;">${whenPhrase(item.daysUntil)}</span>${age}
        </p>
      </div>`;
    })
    .join("");
  return `<p>${items.length} ${
    items.length === 1 ? "date is" : "dates are"
  } coming up in your network — time to say something:</p>${rows}
    <p><a href="${opts.appUrl}" style="color:#e2a44c;">Open your calendar in Dhaga →</a></p>`;
}
