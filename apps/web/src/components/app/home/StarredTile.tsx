import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HomeTile } from "@/components/app/home/HomeTile";
import { HOME_PREVIEW_LIMIT } from "@/utils/constants/app";
import type { ContactListItem } from "@/lib/repo/contacts";

/**
 * Home's "Starred" preview tile — the user's pinned favourites, each row a link
 * through to the person's full detail page. Renders nothing when nothing is
 * starred (this is a favourites tile, not a fixture), so the bento backfills
 * instead of showing an empty card.
 */
export function StarredTile({ rows }: { rows: ContactListItem[] }): React.ReactElement | null {
  if (rows.length === 0) return null;

  return (
    <HomeTile title="Starred">
      <div className="space-y-1">
        {rows.slice(0, HOME_PREVIEW_LIMIT).map((person) => (
          <Link
            key={person.id}
            href={`/app/people/${person.id}`}
            className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 transition-colors hover:bg-wash/[0.04]"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm text-paper">{person.name}</span>
              <span className="block truncate text-xs text-fog">{person.companyName || person.title || "No details yet"}</span>
            </span>
            <ArrowRight className="size-3.5 shrink-0 text-fog/60" aria-hidden />
          </Link>
        ))}
      </div>
      <Link href="/app/saved" className="mt-auto inline-flex min-h-11 items-center text-xs text-ember hover:underline">
        View all →
      </Link>
    </HomeTile>
  );
}
