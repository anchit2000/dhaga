import type { CalendarFollowUp } from "@/lib/repo/reminders";

/** Local to this template, mirroring daily-digest.ts — a 5-line helper, not worth a shared import. */
function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/**
 * "Follow-ups due" reminder body — pure template, zero AI cost. Lists the scoped
 * user's overdue + due-today follow-ups (from getDueFollowUpRemindersForUser),
 * linking to the calendar. Contact names, actions, and due hints are user-derived
 * graph data, so every one is HTML-escaped (unlike the LinkedIn/morning reminders,
 * which interpolate only trusted env-derived values — see linkedin-reminder.ts).
 */
export function followUpReminderHtml(
  items: CalendarFollowUp[],
  opts: { appUrl: string },
): string {
  const rows = items
    .map((item) => {
      const overdueTag = item.overdue
        ? `<span style="color:#e2a44c;font-size:12px;">Overdue</span> · `
        : "";
      const when = item.dueHint
        ? `<span style="color:#a49a8a;"> — ${escapeHtml(item.dueHint)}</span>`
        : "";
      return `<div style="border-left:2px solid #e2a44c;padding:2px 0 2px 12px;margin:0 0 14px;">
        <p style="margin:0;font-size:15px;color:#f3ede2;">
          ${overdueTag}${escapeHtml(item.action)}<span style="color:#a49a8a;"> — ${escapeHtml(
            item.contactName,
          )}</span>${when}
        </p>
      </div>`;
    })
    .join("");
  return `<p>${items.length} ${items.length === 1 ? "follow-up is" : "follow-ups are"} due today or overdue:</p>${rows}
    <p><a href="${opts.appUrl}" style="color:#e2a44c;">Open your calendar in Dhaga →</a></p>`;
}
