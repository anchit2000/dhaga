import { insertConfirmation } from "./insert";
import type { ConfirmationPayload } from "@dhaga/core";

export async function createFollowUpDateConfirmation(input: {
  followUpId: string;
  action: string;
  scheduledDate: string;
  alternativeDate: string;
  sourceNoteId: string;
  contactId: string;
}): Promise<string> {
  const payload: ConfirmationPayload = {
    type: "follow_up_date",
    question: `“${input.action}” is already scheduled for Saturday (${input.scheduledDate}). Keep it there, or move it to Sunday (${input.alternativeDate})?`,
    scheduledDate: input.scheduledDate,
    alternativeDate: input.alternativeDate,
    apply: { kind: "update_follow_up_date", followUpId: input.followUpId },
  };
  return insertConfirmation(payload, input.sourceNoteId, input.contactId);
}
