"use client";

import {
  dismissConfirmationAction,
  resolveConfirmationAction,
} from "@/lib/actions/confirmations";
import { ConfirmationButton } from "./ConfirmationButton";
import { ConfirmationCardShell } from "./ConfirmationCardShell";
import type { EnrichmentMatchPayload } from "@dhaga/core";

/**
 * "Is this web-sourced detail really this person?" Confirming clears the fact's
 * unverified badge; dismissing deletes the fact enrichment already wrote. No
 * choice to make — the payload carries the fact id.
 */
export function EnrichmentMatchCard({
  id,
  contactId,
  contactName,
  payload,
}: {
  id: string;
  contactId: string | null;
  contactName: string | null;
  payload: EnrichmentMatchPayload;
}): React.ReactElement {
  return (
    <ConfirmationCardShell question={payload.question} contactName={contactName}>
      {payload.options.length > 0 ? (
        <ul className="space-y-1.5">
          {payload.options.map((option) => (
            <li
              key={option.id}
              className="border-l-2 border-ember/60 pl-2.5 text-sm text-paper"
            >
              {option.label}
              {option.sublabel ? (
                <span className="ml-1 text-xs text-fog">· {option.sublabel}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <ConfirmationButton onRun={() => resolveConfirmationAction(id, undefined, contactId)}>
          Yes, that&rsquo;s them
        </ConfirmationButton>
        <ConfirmationButton variant="ghost" onRun={() => dismissConfirmationAction(id, contactId)}>
          No, remove it
        </ConfirmationButton>
      </div>
    </ConfirmationCardShell>
  );
}
