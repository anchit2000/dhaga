import { z } from "zod";

/**
 * Goal matching: the user writes an objective in their own words ("reach out
 * to VCs", "reconnect with people from the Delhi trip") and a nightly Batch
 * pass judges each contact against it, one contact per call.
 *
 * `fit` only means anything when `matches` is true — it orders the people who
 * already qualified, it does not decide who qualifies. Two fields rather than
 * one score because a threshold on a score would silently drift the
 * qualifying bar every time the prompt changed.
 *
 * No rationale field, same reason as person-kind.ts: model-written free text
 * about a private third party, kept for no ranking value.
 */

export const goalMatchSchema = z.object({
  matches: z
    .boolean()
    .describe(
      "True only if the contact's records positively support the user's objective; false when the records do not say",
    ),
  fit: z
    .number()
    .describe(
      "0–100; how strongly this person serves the objective. Only read when matches is true — return 0 when it is false",
    ),
});

export type GoalMatch = z.infer<typeof goalMatchSchema>;
