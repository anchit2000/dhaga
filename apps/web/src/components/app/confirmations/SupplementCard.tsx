"use client";

import {
  dismissConfirmationAction,
  resolveConfirmationAction,
} from "@/lib/actions/confirmations";
import { ConfirmationButton } from "./ConfirmationButton";
import { ConfirmationCardShell } from "./ConfirmationCardShell";
import type { SupplementPayload } from "@dhaga/core";

/**
 * "Add these newly-extracted details to the contact?" Confirming folds the whole
 * note extraction in via applyExtraction; dismissing drops the proposal. No
 * choice to make — the payload carries the contact and the extraction.
 */
export function SupplementCard({
  id,
  contactId,
  contactName,
  payload,
}: {
  id: string;
  contactId: string | null;
  contactName: string | null;
  payload: SupplementPayload;
}): React.ReactElement {
  return (
    <ConfirmationCardShell question={payload.question} contactName={contactName}>
      {payload.options.length > 0 ? (
        <ul className="space-y-1">
          {payload.options.map((option) => (
            <li key={option.id} className="text-xs text-fog">
              {option.label}
              {option.sublabel ? ` · ${option.sublabel}` : null}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <ConfirmationButton onRun={() => resolveConfirmationAction(id, undefined, contactId)}>
          Add to contact
        </ConfirmationButton>
        <ConfirmationButton variant="ghost" onRun={() => dismissConfirmationAction(id, contactId)}>
          Dismiss
        </ConfirmationButton>
      </div>
    </ConfirmationCardShell>
  );
}
