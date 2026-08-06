"use client";

import { resolveConfirmationAction } from "@/lib/actions/confirmations";
import { ConfirmationButton } from "./ConfirmationButton";
import { ConfirmationCardShell } from "./ConfirmationCardShell";
import type { FollowUpDatePayload } from "@dhaga/core";

export function FollowUpDateCard({
  id,
  contactId,
  contactName,
  payload,
}: {
  id: string;
  contactId: string | null;
  contactName: string | null;
  payload: FollowUpDatePayload;
}): React.ReactElement {
  return (
    <ConfirmationCardShell question={payload.question} contactName={contactName}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <ConfirmationButton
          className="min-h-11 w-full sm:w-auto"
          onRun={() => resolveConfirmationAction(id, { followUpDate: payload.scheduledDate }, contactId)}
        >
          Keep Saturday
        </ConfirmationButton>
        <ConfirmationButton
          className="min-h-11 w-full sm:w-auto"
          variant="ghost"
          onRun={() => resolveConfirmationAction(id, { followUpDate: payload.alternativeDate }, contactId)}
        >
          Move to Sunday
        </ConfirmationButton>
      </div>
    </ConfirmationCardShell>
  );
}
