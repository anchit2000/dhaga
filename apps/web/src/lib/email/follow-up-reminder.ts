import { differenceInCalendarDays } from "date-fns";
import { FOLLOW_UP_LEAD_DAYS } from "@/utils/constants/reminders";
import type { CalendarFollowUp } from "@/lib/repo/reminders";

/** Local to this template, mirroring daily-digest.ts — a 5-line helper, not worth a shared import. */
function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/**
 * Honest urgency for one item. The email now carries a lead window
 * (isDueWithinEmailLeadWindow), so "Overdue" can no longer be the only tag —
 * something due in three days must not read as late, or the tag stops meaning
 * anything and the reader starts ignoring all of them.
 */
function dueLabel(item: CalendarFollowUp, now: Date): string | null {
  if (item.overdue) return "Overdue";
  if (item.dueDate == null) return null;
  const days = differenceInCalendarDays(new Date(item.dueDate), now);
  if (days <= 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

/** Amber for what needs doing now; muted for what is merely coming. */
function labelColor(label: string): string {
  return label === "Overdue" || label === "Due today" ? "#e2a44c" : "#a49a8a";
}

/**
 * "Follow-ups due" reminder body — pure template, zero AI cost. Lists the scoped
 * user's overdue, due-today and due-soon follow-ups (from
 * getDueFollowUpRemindersForUser), linking to the calendar. Contact names,
 * actions, and due hints are user-derived graph data, so every one is
 * HTML-escaped (unlike the LinkedIn/morning reminders, which interpolate only
 * trusted env-derived values — see linkedin-reminder.ts).
 */
export function followUpReminderHtml(
  items: CalendarFollowUp[],
  opts: { appUrl: string; now?: Date },
): string {
  const now = opts.now ?? new Date();
  const rows = items
    .map((item) => {
      const label = dueLabel(item, now);
      const tag = label
        ? `<span style="color:${labelColor(label)};font-size:12px;">${label}</span> · `
        : "";
      const when = item.dueHint
        ? `<span style="color:#a49a8a;"> — ${escapeHtml(item.dueHint)}</span>`
        : "";
      return `<div style="border-left:2px solid #e2a44c;padding:2px 0 2px 12px;margin:0 0 14px;">
        <p style="margin:0;font-size:15px;color:#f3ede2;">
          ${tag}${escapeHtml(item.action)}<span style="color:#a49a8a;"> — ${escapeHtml(
            item.contactName,
          )}</span>${when}
        </p>
      </div>`;
    })
    .join("");
  return `<p>${items.length} ${
    items.length === 1 ? "follow-up is" : "follow-ups are"
  } due now or in the next ${FOLLOW_UP_LEAD_DAYS} days:</p>${rows}
    <p><a href="${opts.appUrl}" style="color:#e2a44c;">Open your calendar in Dhaga →</a></p>`;
}
