"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorSwatchPicker } from "../ColorSwatchPicker";

/** Name + colour editor for one node type (or a new one). Pure form state —
 *  the manager owns persistence, pending, and errors. */
export function TypeEditor({
  initialName,
  initialColor,
  pending,
  onSave,
  onCancel,
}: {
  initialName: string;
  initialColor: string;
  pending: boolean;
  onSave: (name: string, color: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);

  return (
    <div className="space-y-3 rounded-xl border border-seam bg-wash/[0.02] p-4">
      <div>
        <Label htmlFor="type-name" className="mb-2 text-fog">Type name</Label>
        <Input
          id="type-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Gym, School, Project…"
        />
      </div>
      <ColorSwatchPicker value={color} onChange={setColor} />
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          loading={pending}
          disabled={!name.trim()}
          onClick={() => onSave(name, color)}
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
