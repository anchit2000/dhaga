"use server";

import { mutation } from "@/lib/actions/mutation";
import { setLinkedinExportRequestedAt } from "@/lib/repo/linkedin-reminders";

/**
 * Records that the user just kicked off a LinkedIn data export, so the daily job
 * starts nudging them (day 1 / 3 / 6 / 7) to upload the archive once it arrives
 * — stopping the moment they do, or after a week. Fired (fire-and-forget) from
 * the import panel's "Get contacts from LinkedIn" button. Best-effort and
 * idempotent: restarting simply resets the cadence, and a transient failure is
 * swallowed (mutation() logs it PII-safe) rather than blocking the redirect.
 */
export async function startLinkedinExportReminderAction(): Promise<void> {
  await mutation("startLinkedinExportReminder", () =>
    setLinkedinExportRequestedAt(new Date()),
  );
}
