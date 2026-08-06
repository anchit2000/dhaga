"use client";

import Link from "next/link";
import type { RelationshipSourceKind } from "@/components/app/relationships/AddRelationshipDialog";
import { RELATIONSHIP_KIND_LABELS } from "@/utils/constants/graph";
import { EditRelationshipDialog } from "../EditRelationshipDialog";
import { RelationshipDeleteButton } from "../RelationshipDeleteButton";
import type { RelationshipRowView } from "./types";

/** Companies have no detail page yet — send them to the graph instead. */
function hrefFor(row: RelationshipRowView): string {
  if (row.kind === "contact") return `/app/people/${row.targetId}`;
  if (row.kind === "entity") return `/app/entities/${row.targetId}`;
  if (row.kind === "event") return `/app/events/${row.targetId}`;
  return `/app/graph?focus=${row.targetId}`;
}

/** One relationship: a link to the other endpoint plus its edit and remove
 *  affordances. Edit is hidden while the row is still optimistic — there is no
 *  server edge to correct yet. */
export function RelationshipRow({
  row,
  sourceId,
  sourceKind,
  sourceLabel,
  onDelete,
}: {
  row: RelationshipRowView;
  sourceId: string;
  sourceKind: RelationshipSourceKind;
  sourceLabel: string;
  onDelete: () => void;
}): React.ReactElement {
  const saved = !row.edgeId.startsWith("optimistic-");
  return (
    <li className="flex h-full items-center gap-1 rounded-xl border border-seam bg-panel py-2.5 pl-3 pr-2 transition-colors hover:bg-wash/[0.03]">
      <Link href={hrefFor(row)} className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber/15 font-display text-xs text-ember">
          {row.name.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-paper">{row.name}</span>
          <span className="block truncate text-xs capitalize text-ember">{row.role}</span>
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
      {saved ? (
        <EditRelationshipDialog
          edgeId={row.edgeId}
          sourceId={sourceId}
          sourceKind={sourceKind}
          sourceLabel={sourceLabel}
          targetId={row.targetId}
          targetKind={row.kind}
          targetName={row.name}
          predicate={row.predicate}
          viewerIsSource={row.viewerIsSource}
        />
      ) : null}
      <RelationshipDeleteButton name={row.name} role={row.role} onDelete={onDelete} />
    </li>
  );
}
