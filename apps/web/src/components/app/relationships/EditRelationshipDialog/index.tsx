"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/app/feedback";
import type { GraphTarget } from "@/lib/repo/graph-data";
import type { RelationshipEndpointKind } from "@/lib/repo/relationships";
import { DirectionPreview } from "../AddRelationshipDialog/DirectionPreview";
import { PredicateField } from "../AddRelationshipDialog/PredicateField";
import { TargetPicker } from "../AddRelationshipDialog/TargetPicker";
import { useRelationshipEdit } from "./use-relationship-edit";

/**
 * Corrects an existing edge in place — who it connects to, the relationship
 * type, and its direction — reusing the add dialog's target picker, predicate
 * picker and live sentence preview so both surfaces read identically. Fixing
 * "Rohan — father of → Priya" when it should read "child of", should point the
 * other way, or should have been a different Priya altogether previously meant
 * deleting the edge and re-adding it, which also threw away its note receipt.
 *
 * The one end that stays fixed is the node whose page this is — the edge has to
 * keep belonging to the page you are editing it from.
 */
export function EditRelationshipDialog({
  edgeId,
  sourceId,
  sourceKind,
  sourceLabel,
  targetId,
  targetKind,
  targetName,
  predicate,
  viewerIsSource,
}: {
  edgeId: string;
  /** The node whose page this is — the left side of the preview sentence. */
  sourceId: string;
  sourceKind: RelationshipEndpointKind;
  sourceLabel: string;
  targetId: string;
  targetKind: RelationshipEndpointKind;
  targetName: string;
  /** The edge's stored predicate slug. */
  predicate: string;
  /** True when the edge is stored viewed-node → other. */
  viewerIsSource: boolean;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const initialTarget: GraphTarget = {
    id: targetId,
    label: targetName,
    kind: targetKind,
    sublabel: null,
  };
  const edit = useRelationshipEdit({
    edgeId,
    open,
    sourceId,
    sourceKind,
    initialTarget,
    predicate,
    viewerIsSource,
  });

  function handleOpenChange(next: boolean): void {
    setOpen(next);
    if (!next) edit.reset();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Edit relationship with ${targetName}`}
        title={`Edit relationship with ${targetName}`}
        className="rounded-full p-1 text-fog transition-colors hover:bg-wash/[0.06] hover:text-paper"
      >
        <Pencil className="size-3.5" />
      </button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Edit relationship</DialogTitle>
          <DialogDescription>
            Change who this connects to, the relationship, or the direction.
          </DialogDescription>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-fog">Connected to</Label>
              <TargetPicker sourceId={sourceId} value={edit.target} onSelect={edit.setTarget} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-fog">Relationship</Label>
              <PredicateField
                options={edit.options}
                value={edit.selected}
                onSelect={edit.setSelected}
                onTypeCreated={edit.addType}
                onTypeUpdated={edit.updateType}
              />
            </div>
            {edit.selected ? (
              <DirectionPreview
                sourceName={sourceLabel}
                forward={edit.selected.forward}
                targetName={edit.target?.label ?? "…"}
                flipped={edit.flipped}
                onFlip={edit.toggleFlip}
              />
            ) : null}
            <FormError message={edit.error} />
          </div>
          <DialogFooter>
            <Button
              loading={edit.pending}
              disabled={!edit.selected || !edit.target || !edit.changed}
              onClick={() => edit.submit(() => setOpen(false))}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
