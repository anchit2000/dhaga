import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Waypoints } from "lucide-react";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { getEntity } from "@/lib/repo/entities";
import { listEntityNotes } from "@/lib/repo/entity-notes";
import { listEntityRelationships } from "@/lib/repo/relationships";
import { Button } from "@/components/ui/button";
import { DeleteEntityButton } from "@/components/app/entities/DeleteEntityButton";
import { EntityNoteForm } from "@/components/app/entities/EntityNoteForm";
import { NoteList } from "@/components/app/contact/NoteList";
import { RelationshipSection } from "@/components/app/relationships/RelationshipSection";

export const metadata = { title: "Entity — Dhaga" };

export default async function EntityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUserIdForPage();
  const { id } = await params;
  const entity = await getEntity(id);
  if (!entity) notFound();
  const [relationships, entityNotes] = await Promise.all([
    listEntityRelationships(id),
    listEntityNotes(id),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span
            className="flex size-14 shrink-0 items-center justify-center rounded-full font-display text-xl"
            style={{ backgroundColor: `${entity.typeColor}26`, color: entity.typeColor }}
          >
            {entity.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl tracking-tight">{entity.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span
                className="rounded-full border px-2.5 py-0.5 text-xs"
                style={{
                  borderColor: `${entity.typeColor}4d`,
                  backgroundColor: `${entity.typeColor}1a`,
                  color: entity.typeColor,
                }}
              >
                {entity.typeName}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button render={<Link href={`/app/entities/${id}/edit`} />} variant="outline" size="sm">
            <Pencil />
            Edit
          </Button>
          <Button render={<Link href={`/app/graph?focus=${id}`} />} variant="outline" size="sm">
            <Waypoints />
            View in graph
          </Button>
        </div>
      </div>

      {entity.description ? (
        <p className="max-w-2xl text-sm leading-relaxed text-fog">{entity.description}</p>
      ) : null}

      <RelationshipSection
        sourceId={id}
        sourceKind="entity"
        sourceLabel={entity.name}
        rows={relationships.map((relationship) => ({
          edgeId: relationship.edgeId,
          targetId: relationship.otherId,
          kind: relationship.kind,
          name: relationship.name,
          role: relationship.role,
        }))}
      />

      <section className="space-y-3">
        <h2 className="font-display text-lg">Notes</h2>
        <EntityNoteForm entityId={id} />
        <NoteList entityId={id} notes={entityNotes} />
      </section>

      <div className="border-t border-seam pt-5">
        <DeleteEntityButton entityId={id} name={entity.name} />
      </div>
    </div>
  );
}
