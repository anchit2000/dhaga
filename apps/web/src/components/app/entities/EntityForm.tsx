"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createEntityAction, updateEntityAction } from "@/lib/actions/entities";
import { createNodeTypeAction } from "@/lib/actions/node-types";
import { NODE_TYPE_COLOR_SWATCHES } from "@/utils/constants/graph";
import { ColorSwatchPicker } from "./ColorSwatchPicker";

const NEW_TYPE_VALUE = "__new__";

export interface NodeTypeOption {
  id: string;
  name: string;
  color: string;
}

/** Create/edit an entity; the type select can mint a new node type inline so
 *  the first entity doesn't require a detour through the type manager. */
export function EntityForm({
  types,
  entityId,
  initial,
}: {
  types: NodeTypeOption[];
  /** Present in edit mode; absent when creating. */
  entityId?: string;
  initial?: { name: string; typeId: string; description: string | null };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [typeId, setTypeId] = useState(initial?.typeId ?? types[0]?.id ?? NEW_TYPE_VALUE);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeColor, setNewTypeColor] = useState(NODE_TYPE_COLOR_SWATCHES[0]);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    startTransition(async () => {
      let resolvedTypeId = typeId;
      if (typeId === NEW_TYPE_VALUE) {
        const created = await createNodeTypeAction({ name: newTypeName, color: newTypeColor });
        if (created.error || !created.id) {
          setError(created.error ?? "Could not create the type.");
          return;
        }
        resolvedTypeId = created.id;
      }
      const result = entityId
        ? await updateEntityAction(entityId, { name, typeId: resolvedTypeId, description })
        : await createEntityAction({ typeId: resolvedTypeId, name, description });
      const targetId = entityId ?? result.id;
      if (result.error || !targetId) {
        setError(result.error ?? "Could not save the entity.");
        return;
      }
      router.push(`/app/entities/${targetId}`);
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="entity-name" className="mb-2 text-fog">Name</Label>
        <Input
          id="entity-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          placeholder="Gold's Gym, Book club, Project Falcon…"
        />
      </div>
      <div>
        <Label htmlFor="entity-type" className="mb-2 text-fog">Type</Label>
        <Select
          id="entity-type"
          value={typeId}
          onChange={(event) => setTypeId(event.target.value)}
        >
          {types.map((type) => (
            <option key={type.id} value={type.id}>{type.name}</option>
          ))}
          <option value={NEW_TYPE_VALUE}>Create new type…</option>
        </Select>
      </div>
      {typeId === NEW_TYPE_VALUE ? (
        <div className="space-y-3 rounded-xl border border-seam bg-wash/[0.02] p-4">
          <div>
            <Label htmlFor="new-type-name" className="mb-2 text-fog">Type name</Label>
            <Input
              id="new-type-name"
              value={newTypeName}
              onChange={(event) => setNewTypeName(event.target.value)}
              required
              placeholder="Gym, School, Project…"
            />
          </div>
          <ColorSwatchPicker value={newTypeColor} onChange={setNewTypeColor} />
        </div>
      ) : null}
      <div>
        <Label htmlFor="entity-description" className="mb-2 text-fog">Description</Label>
        <Textarea
          id="entity-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="Optional — what is this, and why does it matter?"
        />
      </div>
      {error ? (
        <p className="text-sm text-red-400" role="alert">{error}</p>
      ) : null}
      <Button type="submit" loading={pending}>
        {entityId ? "Save changes" : "Create entity"}
      </Button>
    </form>
  );
}
