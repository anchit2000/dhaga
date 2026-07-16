import Link from "next/link";
import type { EntityWithType } from "@/lib/repo/entities";

export function EntityCard({ entity }: { entity: EntityWithType }) {
  return (
    <Link
      href={`/app/entities/${entity.id}`}
      className="flex h-full flex-col gap-1.5 rounded-2xl border border-seam bg-panel p-4 transition-colors hover:bg-wash/[0.03]"
    >
      <span className="flex min-w-0 items-center gap-2">
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: entity.typeColor }}
        />
        <span className="truncate text-sm font-medium text-paper">{entity.name}</span>
      </span>
      <span className="font-mono text-[10px] uppercase tracking-wider text-fog/60">
        {entity.typeName}
      </span>
      {entity.description ? (
        <span className="line-clamp-2 text-xs leading-relaxed text-fog">
          {entity.description}
        </span>
      ) : null}
    </Link>
  );
}
