"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createRelationshipTypeAction,
  type RelationshipTypeOption,
} from "@/lib/actions/relationship-types";
import { toSlug } from "@/utils/slug";

/** Inline relationship-type creation: forward + inverse labels; the slug is
 *  derived from the forward label (shown here, validated server-side). */
export function CreateTypePanel({
  initialForward,
  onCreated,
  onCancel,
}: {
  initialForward: string;
  onCreated: (created: RelationshipTypeOption) => void;
  onCancel: () => void;
}) {
  const [forwardLabel, setForwardLabel] = useState(initialForward);
  const [inverseLabel, setInverseLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const derivedSlug = toSlug(forwardLabel);

  function createType(): void {
    startTransition(async () => {
      const result = await createRelationshipTypeAction({ forwardLabel, inverseLabel });
      if (result.error || !result.slug || !result.id) {
        setError(result.error ?? "Could not create the type.");
        return;
      }
      onCreated({
        id: result.id,
        slug: result.slug,
        forwardLabel: forwardLabel.trim(),
        inverseLabel: inverseLabel.trim(),
      });
    });
  }

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-seam bg-wash/[0.02] p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <Label htmlFor="forward-label" className="mb-1.5 text-fog">Forward label</Label>
          <Input
            id="forward-label"
            value={forwardLabel}
            onChange={(event) => setForwardLabel(event.target.value)}
            placeholder="father of"
          />
        </div>
        <div>
          <Label htmlFor="inverse-label" className="mb-1.5 text-fog">Inverse label</Label>
          <Input
            id="inverse-label"
            value={inverseLabel}
            onChange={(event) => setInverseLabel(event.target.value)}
            placeholder="child of"
          />
        </div>
      </div>
      {derivedSlug ? (
        <p className="font-mono text-[10px] uppercase tracking-wider text-fog/60">
          Saved as {derivedSlug}
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-400" role="alert">{error}</p> : null}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          loading={pending}
          disabled={!forwardLabel.trim() || !inverseLabel.trim()}
          onClick={createType}
        >
          Create type
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
