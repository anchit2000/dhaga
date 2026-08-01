"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Link2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteRelationshipTypeAction,
  updateRelationshipTypeAction,
} from "@/lib/actions/relationship-types";
import { FormError } from "@/components/app/feedback";
import { RelationshipTypeEditor } from "@/components/app/relationships/RelationshipTypeEditor";

export interface RelationshipTypeWithCount {
  id: string;
  slug: string;
  forwardLabel: string;
  inverseLabel: string;
  count: number;
}

/** Rename/delete relationship types; creation only happens from the "Add
 *  relationship" dialog's inline create flow. Delete stays blocked (and
 *  explained) while edges use the type — the action is the source of that
 *  truth. */
export function RelationshipTypeManager({ types }: { types: RelationshipTypeWithCount[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const editing = types.find((type) => type.id === editingId) ?? null;

  function run(operation: () => Promise<{ error?: string }>): void {
    startTransition(async () => {
      const result = await operation();
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setEditingId(null);
      router.refresh();
    });
  }

  function save(forwardLabel: string, inverseLabel: string): void {
    run(() => updateRelationshipTypeAction(editingId ?? "", { forwardLabel, inverseLabel }));
  }

  function remove(type: RelationshipTypeWithCount): void {
    if (!confirm(`Delete the "${type.forwardLabel}" type?`)) return;
    run(() => deleteRelationshipTypeAction(type.id));
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Link2 />
        Manage relationship types
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Relationship types</DialogTitle>
          <DialogDescription>
            The labels you can put on a connection between two things — each has a forward and
            inverse phrasing.
          </DialogDescription>
          <div className="space-y-3">
            {types.length === 0 ? (
              <p className="text-sm text-fog">
                No custom relationship types yet — create one from the &ldquo;Add
                relationship&rdquo; dialog.
              </p>
            ) : (
              <ul className="divide-y divide-seam overflow-hidden rounded-xl border border-seam">
                {types.map((type) => (
                  <li key={type.id} className="flex items-center gap-2.5 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-sm text-paper">
                      {type.forwardLabel}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-fog">
                      {type.count === 1 ? "1 relationship" : `${type.count} relationships`}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setEditingId(type.id);
                      }}
                      aria-label={`Edit ${type.forwardLabel}`}
                      className="rounded-full p-1 text-fog transition-colors hover:bg-wash/[0.06] hover:text-paper"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(type)}
                      disabled={pending || type.count > 0}
                      aria-label={`Delete ${type.forwardLabel}`}
                      title={
                        type.count > 0
                          ? "This type still has relationships. Delete or retype them first."
                          : `Delete ${type.forwardLabel}`
                      }
                      className="rounded-full p-1 text-fog transition-colors hover:bg-wash/[0.06] hover:text-paper disabled:pointer-events-none disabled:opacity-40"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {editingId ? (
              <RelationshipTypeEditor
                key={editingId}
                initialForwardLabel={editing?.forwardLabel ?? ""}
                initialInverseLabel={editing?.inverseLabel ?? ""}
                pending={pending}
                onSave={save}
                onCancel={() => setEditingId(null)}
              />
            ) : null}
            <FormError message={error} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
