"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toastError } from "@/components/app/feedback";
import { EntityCombobox } from "@/components/app/EntityCombobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  dismissConfirmationAction,
  resolveConfirmationAction,
} from "@/lib/actions/confirmations";
import { ConfirmationButton } from "./ConfirmationButton";
import { ConfirmationCardShell } from "./ConfirmationCardShell";
import type { NoteSubjectPayload } from "@dhaga/core";
import type { GraphTarget, GraphTargetKind } from "@/lib/repo/graph-data";

const CONTACT_KINDS = ["contact"] as const satisfies readonly GraphTargetKind[];

/**
 * "Who is this note about?" — a captured note the classifier couldn't pin to
 * one person. Attach it to an existing contact (a surfaced candidate or any
 * searched person) OR create a brand-new contact from the typed name ("no, this
 * is a NEW Anchit") — only then is the note written and fact-extracted. When
 * there are no candidates the card leads with the create-new input.
 */
export function NoteSubjectCard({
  id,
  contactId,
  contactName,
  payload,
}: {
  id: string;
  contactId: string | null;
  contactName: string | null;
  payload: NoteSubjectPayload;
}): React.ReactElement {
  const [name, setName] = useState<string>(payload.apply.subjectName ?? "");
  const [pending, startTransition] = useTransition();
  const hasOptions = payload.options.length > 0;

  function attachToExisting(existingContactId: string): void {
    startTransition(async () => {
      try {
        await resolveConfirmationAction(
          id,
          { noteSubject: { contactId: existingContactId } },
          contactId,
        );
      } catch {
        toastError("Couldn't attach the note. Please try again.", () =>
          attachToExisting(existingContactId),
        );
      }
    });
  }

  function createAndAttach(createName: string): void {
    startTransition(async () => {
      try {
        await resolveConfirmationAction(id, { noteSubject: { createName } }, contactId);
      } catch {
        toastError("Couldn't create that contact. Please try again.", () =>
          createAndAttach(createName),
        );
      }
    });
  }

  function handleCreateSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const createName = name.trim();
    if (!createName) return;
    createAndAttach(createName);
  }

  return (
    <ConfirmationCardShell question={payload.question} contactName={contactName}>
      <div className="max-h-32 overflow-y-auto rounded-lg border border-seam bg-wash/[0.03] p-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-fog">Note</p>
        <p className="mt-1 text-sm whitespace-pre-wrap break-words text-paper">
          {payload.apply.noteBody}
        </p>
      </div>

      {hasOptions ? (
        <div className="flex flex-wrap gap-2">
          {payload.options.map((option) => (
            <ConfirmationButton
              key={option.id}
              onRun={() =>
                resolveConfirmationAction(
                  id,
                  { noteSubject: { contactId: option.id } },
                  contactId,
                )
              }
            >
              {option.label}
              {option.sublabel ? <span className="text-fog"> · {option.sublabel}</span> : null}
            </ConfirmationButton>
          ))}
        </div>
      ) : null}

      <form onSubmit={handleCreateSubmit} className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="New contact name"
          aria-label="New contact name"
          disabled={pending}
          className="h-11"
        />
        <Button
          type="submit"
          size="sm"
          variant="outline"
          loading={pending}
          disabled={!name.trim()}
          className="h-11 shrink-0"
        >
          {hasOptions ? "New person" : "Create + attach"}
        </Button>
      </form>

      <EntityCombobox
        kinds={CONTACT_KINDS}
        onSelect={(target: GraphTarget) => attachToExisting(target.id)}
        placeholder="Or search an existing person…"
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
