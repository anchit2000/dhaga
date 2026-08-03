import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/request-scope";
import { feedback } from "@/lib/db/schema";
import type { FeedbackRow } from "@/lib/db/schema";
import type { FeedbackSubmission } from "@/lib/feedback/context";

/**
 * Store one report. `user_id` is never named here — EE's RLS column default
 * (`current_setting('app.current_user_id')`) fills it from the scope the caller
 * opened, exactly as every other tenant table does.
 *
 * One statement, one await: the caller closes the scope before emailing the
 * owner, so no tenant connection is ever held across the Resend call (PR #92).
 */
export async function createFeedback(input: FeedbackSubmission): Promise<FeedbackRow> {
  const db = await getDb();
  const [created] = await db
    .insert(feedback)
    .values({
      id: randomUUID(),
      message: input.message,
      route: input.route,
      viewport: input.viewport ?? null,
      userAgent: input.userAgent ?? null,
      locale: input.locale ?? null,
      timezone: input.timezone ?? null,
      appVersion: input.appVersion ?? null,
    })
    .returning();
  return created;
}
