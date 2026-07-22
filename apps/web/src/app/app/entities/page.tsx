import Link from "next/link";
import { EmptyState } from "@/components/app/EmptyState";
import { EntityCard } from "@/components/app/entities/EntityCard";
import { NodeTypeManager } from "@/components/app/entities/NodeTypeManager";
import { Button } from "@/components/ui/button";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { getCachedNodeTypes } from "@/lib/cache/node-types";
import { listEntities } from "@/lib/repo/entities";
import { cn } from "@/lib/utils";

export const metadata = { title: "Entities — Dhaga" };

export default async function EntitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const userId = await requireUserIdForPage();
  const { type } = await searchParams;
  const [entityRows, types] = await Promise.all([listEntities(), getCachedNodeTypes(userId)]);
  const counts = new Map<string, number>();
  for (const entity of entityRows) {
    counts.set(entity.typeId, (counts.get(entity.typeId) ?? 0) + 1);
  }
  const typesWithCounts = types.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    color: row.color,
    count: counts.get(row.id) ?? 0,
  }));
  const activeType = types.find((row) => row.slug === type) ?? null;
  const groups = types
    .filter((row) => (activeType ? row.id === activeType.id : true))
    .map((row) => ({
      type: row,
      entities: entityRows.filter((entity) => entity.typeId === row.id),
    }))
    .filter((group) => group.entities.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl tracking-tight">Entities</h1>
        <div className="flex items-center gap-2">
          <NodeTypeManager types={typesWithCounts} />
          <Button render={<Link href="/app/entities/new" />} size="sm">
            New entity
          </Button>
        </div>
      </div>

      {entityRows.length === 0 ? (
        <EmptyState
          title="No entities yet"
          body="Gyms, schools, projects — anything in your life that connects people. Create one, then relate people to it."
        >
          <Button render={<Link href="/app/entities/new" />} variant="outline" size="sm">
            Create your first entity
          </Button>
        </EmptyState>
      ) : (
        <>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <FilterChip href="/app/entities" active={!activeType} label="All" />
            {typesWithCounts
              .filter((row) => row.count > 0)
              .map((row) => (
                <FilterChip
                  key={row.id}
                  href={`/app/entities?type=${encodeURIComponent(row.slug)}`}
                  active={activeType?.id === row.id}
                  label={`${row.name} · ${row.count}`}
                  color={row.color}
                />
              ))}
          </div>
          {groups.length === 0 ? (
            <p className="text-sm text-fog">No entities of this type yet.</p>
          ) : (
            groups.map((group) => (
              <section key={group.type.id} className="space-y-3">
                <h2 className="flex items-center gap-2 font-display text-lg">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: group.type.color }}
                  />
                  {group.type.name}
                  <span className="font-mono text-[10px] uppercase tracking-wider text-fog/60">
                    {group.entities.length}
                  </span>
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {group.entities.map((entity) => (
                    <EntityCard key={entity.id} entity={entity} />
                  ))}
                </div>
              </section>
            ))
          )}
        </>
      )}
    </div>
  );
}

function FilterChip({
  href,
  active,
  label,
  color,
}: {
  href: string;
  active: boolean;
  label: string;
  color?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition-colors",
        active
          ? "border-amber/30 bg-amber/10 text-amber"
          : "border-seam text-fog hover:text-paper",
      )}
    >
      {color ? (
        <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
      ) : null}
      {label}
    </Link>
  );
}
