"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createNodeTypeAction,
  deleteNodeTypeAction,
  updateNodeTypeAction,
} from "@/lib/actions/node-types";
import { NODE_TYPE_COLOR_SWATCHES } from "@/utils/constants/graph";
import { TypeEditor } from "./TypeEditor";

export interface NodeTypeWithCount {
  id: string;
  name: string;
  color: string;
  count: number;
}

const NEW_ID = "__new__";

/** Create/rename/recolor node types; delete stays blocked (and explained)
 *  while entities of the type exist — the action is the source of that truth. */
export function NodeTypeManager({ types }: { types: NodeTypeWithCount[] }) {
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

  function save(name: string, color: string): void {
    run(() =>
      editingId === NEW_ID
        ? createNodeTypeAction({ name, color })
        : updateNodeTypeAction(editingId ?? "", { name, color }),
    );
  }

  function remove(type: NodeTypeWithCount): void {
    if (!confirm(`Delete the "${type.name}" type?`)) return;
    run(() => deleteNodeTypeAction(type.id));
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Settings2 />
        Manage types
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Entity types</DialogTitle>
          <DialogDescription>
            The kinds of things in your graph — each gets a colour.
          </DialogDescription>
          <div className="space-y-3">
            {types.length === 0 ? (
              <p className="text-sm text-fog">No types yet — create the first one.</p>
            ) : (
              <ul className="divide-y divide-seam overflow-hidden rounded-xl border border-seam">
                {types.map((type) => (
                  <li key={type.id} className="flex items-center gap-2.5 px-3 py-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: type.color }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-paper">{type.name}</span>
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-fog/60">
                      {type.count === 1 ? "1 entity" : `${type.count} entities`}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setEditingId(type.id);
                      }}
                      aria-label={`Edit ${type.name}`}
                      className="rounded-full p-1 text-fog/60 transition-colors hover:bg-wash/[0.06] hover:text-paper"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(type)}
                      disabled={pending || type.count > 0}
                      aria-label={`Delete ${type.name}`}
                      title={
                        type.count > 0
                          ? "This type still has entities. Delete or retype them first."
                          : `Delete ${type.name}`
                      }
                      className="rounded-full p-1 text-fog/60 transition-colors hover:bg-wash/[0.06] hover:text-paper disabled:pointer-events-none disabled:opacity-40"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {editingId ? (
              <TypeEditor
                key={editingId}
                initialName={editing?.name ?? ""}
                initialColor={editing?.color ?? NODE_TYPE_COLOR_SWATCHES[0]}
                pending={pending}
                onSave={save}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <Button variant="outline" size="sm" onClick={() => setEditingId(NEW_ID)}>
                New type
              </Button>
            )}
            {error ? (
              <p className="text-sm text-red-400" role="alert">{error}</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
