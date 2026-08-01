"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { createRelationshipAction } from "@/lib/actions/relationships";
import { FormError } from "@/components/app/feedback";
import { RELATIONSHIP_KIND_LABELS } from "@/utils/constants/graph";
import type { GraphTarget } from "@/lib/repo/graph-data";
import { DirectionPreview } from "./DirectionPreview";
import { PredicateField } from "./PredicateField";
import { TargetPicker } from "./TargetPicker";
import { buildPredicateOptions, type PredicateOption } from "./predicate-options";
import { useRelationshipTypes } from "./useRelationshipTypes";

export type RelationshipSourceKind = "contact" | "company" | "event" | "entity";

/** What the dialog hands its host when the user confirms an edge — enough for
 *  the host to render an optimistic row and build the server submit itself. */
export interface RelationshipDraft {
  target: GraphTarget;
  predicate: PredicateOption;
  flipped: boolean;
}

/**
 * Manual edge creation from any node page or the graph side panel. The source
 * is fixed by the host surface; the user picks the other endpoint, a predicate
 * (built-in or their own types, creatable inline), and the direction — the
 * live sentence preview is what makes direction legible.
 */
export function AddRelationshipDialog({
  sourceId,
  sourceKind,
  sourceLabel,
  onCreated,
  onCreate,
}: {
  sourceId: string;
  sourceKind: RelationshipSourceKind;
  /** Optional display name for the preview; falls back to "This person" etc. */
  sourceLabel?: string;
  onCreated?: () => void;
  /** When set, the host owns the write (optimistic list): the dialog closes
   *  instantly and hands off the draft instead of calling the action itself. */
  onCreate?: (draft: RelationshipDraft) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { customTypes, addType, updateType } = useRelationshipTypes(open);
  const [target, setTarget] = useState<GraphTarget | null>(null);
  const [predicate, setPredicate] = useState<PredicateOption | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const sourceName = sourceLabel ?? `This ${RELATIONSHIP_KIND_LABELS[sourceKind].toLowerCase()}`;

  function handleOpenChange(next: boolean): void {
    setOpen(next);
    if (!next) {
      setTarget(null);
      setPredicate(null);
      setFlipped(false);
      setError(null);
    }
  }

  function submit(): void {
    if (!target || !predicate) return;
    if (onCreate) {
      // Host-owned optimistic path: hand off the draft and close instantly —
      // the new row already appears in the host's list.
      onCreate({ target, predicate, flipped });
      handleOpenChange(false);
      onCreated?.();
      return;
    }
    startTransition(async () => {
      const source = { id: sourceId, kind: sourceKind };
      const [src, dst] = flipped ? [target, source] : [source, target];
      const result = await createRelationshipAction({
        srcId: src.id,
        srcKind: src.kind,
        dstId: dst.id,
        dstKind: dst.kind,
        predicate: predicate.slug,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      handleOpenChange(false);
      router.refresh();
      onCreated?.();
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus />
        Add relationship
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Add relationship</DialogTitle>
          <DialogDescription>
            Pick the other end, the relationship, and the direction.
          </DialogDescription>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-fog">Connected to</Label>
              <TargetPicker sourceId={sourceId} value={target} onSelect={setTarget} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-fog">Relationship</Label>
              <PredicateField
                options={buildPredicateOptions(customTypes, sourceKind, target?.kind ?? null)}
                value={predicate}
                onSelect={setPredicate}
                onTypeCreated={addType}
                onTypeUpdated={updateType}
              />
            </div>
            {predicate ? (
              <DirectionPreview
                sourceName={sourceName}
                forward={predicate.forward}
                targetName={target?.label ?? "…"}
                flipped={flipped}
                onFlip={() => setFlipped((value) => !value)}
              />
            ) : null}
            <FormError message={error} />
          </div>
          <DialogFooter>
            <Button loading={pending} disabled={!target || !predicate} onClick={submit}>
              Add relationship
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
