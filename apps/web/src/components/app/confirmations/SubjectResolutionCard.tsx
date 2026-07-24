"use client";

import { useTransition } from "react";
import { toast } from "sonner";
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
 * only then is the relationship written into the graph.
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

  function resolveSubject(subjectContactId: string): void {
    startTransition(async () => {
      try {
        await resolveConfirmationAction(id, { subjectContactId }, contactId);
      } catch {
        toast.error("Couldn't resolve that. Please try again.");
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
        onSelect={(target: GraphTarget) => resolveSubject(target.id)}
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
