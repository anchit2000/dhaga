import type { FollowUpSummary } from "./types";

export function followUpLabel(followUp: FollowUpSummary): string {
  if (followUp.contactName && followUp.companyName) {
    return `${followUp.contactName} · ${followUp.companyName}`;
  }
  return followUp.contactName ?? followUp.companyName ?? "Personal task";
}
