"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { EntityCombobox } from "@/components/app/EntityCombobox";
import { Select } from "@/components/ui/select";
import {
  dismissConfirmationAction,
  resolveConfirmationAction,
} from "@/lib/actions/confirmations";
import { ConfirmationButton } from "./ConfirmationButton";
import { ConfirmationCardShell } from "./ConfirmationCardShell";
import type { EntityLinkPayload } from "@dhaga/core";
import type { GraphTarget, GraphTargetKind } from "@/lib/repo/graph-data";

const PERSON_KINDS = ["contact"] as const satisfies readonly GraphTargetKind[];
const ENTITY_KINDS = ["entity"] as const satisfies readonly GraphTargetKind[];

/**
 * "Which X does this refer to?" — link an ambiguous mention to a contact (a
 * person object) or an entity. Backfilled rows arrive with `options: []`, so
 * beyond any precomputed candidate chips the card always offers a search over
 * existing people/entities plus a "create new" path, mirroring the retiring
 * relationship inbox.
 */
export function EntityLinkCard({
  id,
  contactId,
  contactName,
  payload,
  nodeTypes,
}: {
  id: string;
  contactId: string | null;
  contactName: string | null;
  payload: EntityLinkPayload;
  nodeTypes: { id: string; name: string }[];
}): React.ReactElement {
  const isPerson = payload.apply.objectType === "person";
  const objectName = payload.apply.objectName;
  const [typeId, setTypeId] = useState<string>(nodeTypes[0]?.id ?? "");
  const [pending, startTransition] = useTransition();

  function linkExisting(targetId: string): void {
    startTransition(async () => {
      try {
        await resolveConfirmationAction(
          id,
          { target: isPerson ? { contactId: targetId } : { entityId: targetId } },
          contactId,
        );
      } catch {
        toast.error("Couldn't link that. Please try again.");
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
                resolveConfirmationAction(
                  id,
                  { target: isPerson ? { contactId: option.id } : { entityId: option.id } },
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

      <EntityCombobox
        kinds={isPerson ? PERSON_KINDS : ENTITY_KINDS}
        onSelect={(target: GraphTarget) => linkExisting(target.id)}
        placeholder={isPerson ? "Search people…" : "Search entities…"}
        disabled={pending}
        clearOnSelect
      />

      <div className="flex flex-wrap items-center gap-2">
        {isPerson ? (
          <ConfirmationButton
            onRun={() =>
              resolveConfirmationAction(id, { target: { newContact: true } }, contactId)
            }
          >
            + New “{objectName}”
          </ConfirmationButton>
        ) : nodeTypes.length > 0 ? (
          <div className="flex items-center gap-2">
            <Select
              value={typeId}
              onChange={(event) => setTypeId(event.target.value)}
              aria-label="Type for the new entity"
              className="h-9 w-auto min-w-24 rounded-full px-3 text-xs md:text-xs"
            >
              {nodeTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </Select>
            <ConfirmationButton
              onRun={() =>
                resolveConfirmationAction(id, { target: { newEntity: { typeId } } }, contactId)
              }
            >
              + New “{objectName}”
            </ConfirmationButton>
          </div>
        ) : null}
        <ConfirmationButton variant="ghost" onRun={() => dismissConfirmationAction(id, contactId)}>
          Dismiss
        </ConfirmationButton>
      </div>
    </ConfirmationCardShell>
  );
}
