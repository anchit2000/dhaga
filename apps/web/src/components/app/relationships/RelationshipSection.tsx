import Link from "next/link";
import { AddRelationshipDialog, type RelationshipSourceKind } from "@/components/app/relationships/AddRelationshipDialog";
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
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg">Relationships</h2>
        <AddRelationshipDialog sourceId={sourceId} sourceKind={sourceKind} sourceLabel={sourceLabel} />
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-fog">
          No relationships yet — connect {sourceLabel} to the people and places around them.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {rows.map((row) => (
            <li
              key={row.edgeId}
              className="flex h-full items-center gap-1 rounded-xl border border-seam bg-panel py-2.5 pl-3 pr-2 transition-colors hover:bg-wash/[0.03]"
            >
              <Link href={hrefFor(row)} className="flex min-w-0 flex-1 items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber/15 font-display text-xs text-amber">
                  {row.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-paper">
                    {row.name}
                  </span>
                  <span className="block truncate text-xs capitalize text-amber/80">
                    {row.role}
                  </span>
                  {row.mentioned ? (
                    <span className="mt-1 inline-flex rounded-full border border-seam px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-fog">
                      Mentioned person
                    </span>
                  ) : null}
                </span>
                {row.kind !== "contact" ? (
                  <span className="ml-auto shrink-0 font-mono text-[9px] uppercase tracking-wider text-fog/60">
                    {RELATIONSHIP_KIND_LABELS[row.kind]}
                  </span>
                ) : null}
              </Link>
              <RelationshipDeleteButton edgeId={row.edgeId} name={row.name} role={row.role} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
