import { z } from "zod";

const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const updateFollowUpDateApplySchema = z.object({
  kind: z.literal("update_follow_up_date"),
  followUpId: z.string(),
});

export const followUpDatePayloadSchema = z.object({
  type: z.literal("follow_up_date"),
  question: z.string(),
  scheduledDate: calendarDateSchema,
  alternativeDate: calendarDateSchema,
  apply: updateFollowUpDateApplySchema,
});

export type FollowUpDatePayload = z.infer<typeof followUpDatePayloadSchema>;
export type UpdateFollowUpDateApply = z.infer<typeof updateFollowUpDateApplySchema>;
