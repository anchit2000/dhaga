"use client";

import { useTransition } from "react";
import { toastActionError } from "@/components/app/feedback";
import { EntityCombobox } from "@/components/app/EntityCombobox";
import {
  dismissConfirmationAction,
  resolveConfirmationAction,
} from "@/lib/actions/confirmations";
import { ConfirmationButton } from "./ConfirmationButton";
import { ConfirmationCardShell } from "./ConfirmationCardShell";
import type { SubjectResolutionPayload } from "@dhaga/core";
import type { GraphTarget, GraphTargetKind } from "@/lib/repo/graph-data";

const CONTACT_KINDS = ["contact"] as const satisfies readonly GraphTargetKind[];

/**
 * "Who is this about?" — a note used a pronoun or bare reference the extractor
 * couldn't pin to one contact. Pick which existing contact the subject is, and
 * only then is the relationship written into the graph. When the search turns up
 * nobody, the same field creates the person from the typed name — otherwise the
 * only way out of a subject who isn't in the graph yet is Dismiss.
 */
export function SubjectResolutionCard({
  id,
  contactId,
  contactName,
  payload,
}: {
  id: string;
  contactId: string | null;
  contactName: string | null;
  payload: SubjectResolutionPayload;
}): React.ReactElement {
  const [pending, startTransition] = useTransition();

  function resolveSubject(choice: { subjectContactId: string } | { subjectCreateName: string }): void {
    startTransition(async () => {
      try {
        await resolveConfirmationAction(id, choice, contactId);
      } catch (error) {
        toastActionError(error, "Couldn't resolve that. Please try again.", () =>
          resolveSubject(choice),
        );
      }
    });
  }

  return (
    <ConfirmationCardShell question={payload.question} contactName={contactName}>
      {payload.options.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {payload.options.map((option) => (
            <ConfirmationButton
              key={option.id}
              onRun={() =>
                resolveConfirmationAction(id, { subjectContactId: option.id }, contactId)
              }
            >
              {option.label}
              {option.sublabel ? <span className="text-fog"> · {option.sublabel}</span> : null}
            </ConfirmationButton>
          ))}
        </div>
      ) : null}

      <EntityCombobox
        kinds={CONTACT_KINDS}
        onSelect={(target: GraphTarget) => resolveSubject({ subjectContactId: target.id })}
        onCreate={(name: string) => resolveSubject({ subjectCreateName: name })}
        createLabel="Add new person"
        placeholder="Search people…"
        disabled={pending}
        clearOnSelect
      />

      <div className="flex flex-wrap items-center gap-2">
        <ConfirmationButton variant="ghost" onRun={() => dismissConfirmationAction(id, contactId)}>
          Dismiss
        </ConfirmationButton>
      </div>
    </ConfirmationCardShell>
  );
}
