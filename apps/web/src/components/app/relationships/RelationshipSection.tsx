"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AddRelationshipDialog,
  type RelationshipDraft,
  type RelationshipSourceKind,
} from "@/components/app/relationships/AddRelationshipDialog";
import { createRelationshipAction, deleteRelationshipAction } from "@/lib/actions/relationships";
import { useOptimisticList } from "@/lib/hooks/useOptimisticList";
import { RELATIONSHIP_KIND_LABELS } from "@/utils/constants/graph";
import { RelationshipDeleteButton } from "./RelationshipDeleteButton";

export interface RelationshipRowView {
  edgeId: string;
  targetId: string;
  kind: RelationshipSourceKind;
  name: string;
  /** Direction-corrected: how the row's node relates to the viewed node. */
  role: string;
  mentioned?: boolean;
}

/** Companies have no detail page yet — send them to the graph instead. */
function hrefFor(row: RelationshipRowView): string {
  if (row.kind === "contact") return `/app/people/${row.targetId}`;
  if (row.kind === "entity") return `/app/entities/${row.targetId}`;
  if (row.kind === "event") return `/app/events/${row.targetId}`;
  return `/app/graph?focus=${row.targetId}`;
}

/**
 * The Relationships block shared by contact and entity pages: rows link to
 * the other endpoint (kind-aware), each is deletable, and new edges start
 * from the AddRelationshipDialog. Shown by default (not behind a click) so an
 * extracted edge like "son of" is immediately visible.
 *
 * Adds are optimistic: the new row appears the instant the dialog confirms,
 * then the server write + revalidation reconcile it. A failed write rolls the
 * row back and offers Retry (useOptimisticList).
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
            <li
              key={row.edgeId}
              className="flex h-full items-center gap-1 rounded-xl border border-seam bg-panel py-2.5 pl-3 pr-2 transition-colors hover:bg-wash/[0.03]"
            >
              <Link href={hrefFor(row)} className="flex min-w-0 flex-1 items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber/15 font-display text-xs text-ember">
                  {row.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-paper">
                    {row.name}
                  </span>
                  <span className="block truncate text-xs capitalize text-ember">
                    {row.role}
                  </span>
                  {row.mentioned ? (
                    <span className="mt-1 inline-flex rounded-full border border-seam px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-fog">
                      Mentioned person
                    </span>
                  ) : null}
                </span>
                {row.kind !== "contact" ? (
                  <span className="ml-auto shrink-0 font-mono text-[9px] uppercase tracking-wider text-fog">
                    {RELATIONSHIP_KIND_LABELS[row.kind]}
                  </span>
                ) : null}
              </Link>
              <RelationshipDeleteButton
                name={row.name}
                role={row.role}
                onDelete={() => handleDelete(row)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
