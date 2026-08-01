"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Forward + inverse label editor for one relationship type. Pure form state —
 *  the caller owns persistence, pending, and errors. */
export function RelationshipTypeEditor({
  initialForwardLabel,
  initialInverseLabel,
  pending,
  onSave,
  onCancel,
}: {
  initialForwardLabel: string;
  initialInverseLabel: string;
  pending: boolean;
  onSave: (forwardLabel: string, inverseLabel: string) => void;
  onCancel: () => void;
}) {
  const [forwardLabel, setForwardLabel] = useState(initialForwardLabel);
  const [inverseLabel, setInverseLabel] = useState(initialInverseLabel);

  return (
    <div className="space-y-3 rounded-xl border border-seam bg-wash/[0.02] p-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <Label htmlFor="rel-forward-label" className="mb-2 text-fog">Forward label</Label>
          <Input
            id="rel-forward-label"
            value={forwardLabel}
            onChange={(event) => setForwardLabel(event.target.value)}
            placeholder="father of"
          />
        </div>
        <div>
          <Label htmlFor="rel-inverse-label" className="mb-2 text-fog">Inverse label</Label>
          <Input
            id="rel-inverse-label"
            value={inverseLabel}
            onChange={(event) => setInverseLabel(event.target.value)}
            placeholder="child of"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          loading={pending}
          disabled={!forwardLabel.trim() || !inverseLabel.trim()}
          onClick={() => onSave(forwardLabel, inverseLabel)}
        >
          Save type
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
