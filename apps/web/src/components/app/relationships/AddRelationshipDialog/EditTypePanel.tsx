"use client";

import { useState, useTransition } from "react";
import {
  updateRelationshipTypeAction,
  type RelationshipTypeOption,
} from "@/lib/actions/relationship-types";
import { FormError } from "@/components/app/feedback";
import { RelationshipTypeEditor } from "@/components/app/relationships/RelationshipTypeEditor";

/** Inline edit of one custom relationship type from the predicate picker —
 *  a sibling of CreateTypePanel that updates instead of creating. */
export function EditTypePanel({
  type,
  onSaved,
  onCancel,
}: {
  type: RelationshipTypeOption;
  onSaved: (updated: RelationshipTypeOption) => void;
  onCancel: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(forwardLabel: string, inverseLabel: string): void {
    startTransition(async () => {
      const result = await updateRelationshipTypeAction(type.id, { forwardLabel, inverseLabel });
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved({ ...type, forwardLabel: forwardLabel.trim(), inverseLabel: inverseLabel.trim() });
    });
  }

  return (
    <div className="mt-2">
      <RelationshipTypeEditor
        initialForwardLabel={type.forwardLabel}
        initialInverseLabel={type.inverseLabel}
        pending={pending}
        onSave={save}
        onCancel={onCancel}
      />
      <FormError message={error} />
    </div>
  );
}
