"use client";

import { useRouter } from "next/navigation";
import {
  AddRelationshipDialog,
  type RelationshipDraft,
  type RelationshipSourceKind,
} from "@/components/app/relationships/AddRelationshipDialog";
import { createRelationshipAction, deleteRelationshipAction } from "@/lib/actions/relationships";
import { useOptimisticList } from "@/lib/hooks/useOptimisticList";
import { RelationshipRow } from "./RelationshipRow";
import type { RelationshipRowView } from "./types";

export type { RelationshipRowView };

/**
 * The Relationships block shared by contact and entity pages: rows link to
 * the other endpoint (kind-aware), each is editable and deletable, and new
 * edges start from the AddRelationshipDialog. Shown by default (not behind a
 * click) so an extracted edge like "son of" is immediately visible.
 *
 * Adds are optimistic: the new row appears the instant the dialog confirms,
 * then the server write + revalidation reconcile it. A failed write rolls the
 * row back and offers Retry (useOptimisticList). Edits are NOT optimistic —
 * they are a correction, so the dialog holds its spinner until the server
 * confirms rather than showing a label that might not have saved.
 */
export function RelationshipSection({
  sourceId,
  sourceKind,
  sourceLabel,
  rows,
}: {
  sourceId: string;
  sourceKind: RelationshipSourceKind;
  sourceLabel: string;
  rows: RelationshipRowView[];
}) {
  const router = useRouter();
  const { items, add, remove } = useOptimisticList<RelationshipRowView>({
    items: rows,
    errorMessage: "Couldn't save that change — please try again.",
  });

  /** Optimistic remove: the row disappears instantly, then the tombstone write
   *  + revalidation reconcile it. A failed write puts the row back and offers
   *  Retry (useOptimisticList). */
  function handleDelete(row: RelationshipRowView): void {
    remove(row, async () => {
      const result = await deleteRelationshipAction(row.edgeId);
      if (result.error) return result.error;
      router.refresh();
      return null;
    });
  }

  function handleCreate({ target, predicate, flipped }: RelationshipDraft): void {
    const optimisticRow: RelationshipRowView = {
      edgeId: `optimistic-${crypto.randomUUID()}`,
      targetId: target.id,
      kind: target.kind,
      name: target.label,
      role: predicate.forward,
      predicate: predicate.slug,
      viewerIsSource: !flipped,
      mentioned: false,
    };
    add(optimisticRow, async () => {
      const source = { id: sourceId, kind: sourceKind };
      const other = { id: target.id, kind: target.kind };
      const [src, dst] = flipped ? [other, source] : [source, other];
      const result = await createRelationshipAction({
        srcId: src.id,
        srcKind: src.kind,
        dstId: dst.id,
        dstKind: dst.kind,
        predicate: predicate.slug,
      });
      if (result.error) return result.error;
      router.refresh();
      return null;
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg">Relationships</h2>
        <AddRelationshipDialog
          sourceId={sourceId}
          sourceKind={sourceKind}
          sourceLabel={sourceLabel}
          onCreate={handleCreate}
        />
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-fog">
          No relationships yet — connect {sourceLabel} to the people and places around them.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {items.map((row) => (
            <RelationshipRow
              key={row.edgeId}
              row={row}
              sourceId={sourceId}
              sourceKind={sourceKind}
              sourceLabel={sourceLabel}
              onDelete={() => handleDelete(row)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
