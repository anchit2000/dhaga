import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HomeTile } from "@/components/app/home/HomeTile";
import { HOME_PREVIEW_LIMIT } from "@/utils/constants/app";
import type { ContactListItem } from "@/lib/repo/contacts";

/** Home's "Recent people" bento tile. Each row links through to the person's
 *  full detail page. */
export function HomeOverview({ people }: { people: ContactListItem[] }): React.ReactElement {
  return (
    <HomeTile title="Recent people">
      <div className="space-y-1">
        {people.length === 0 ? (
          <div className="py-4">
            <p className="text-sm text-paper">No one captured yet.</p>
            <p className="mt-1 text-xs text-fog">Scan a card, paste an intro, or speak a note — people you capture land here.</p>
          </div>
        ) : people.slice(0, HOME_PREVIEW_LIMIT).map((person) => (
          <Link
            key={person.id}
            href={`/app/people/${person.id}`}
            className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 transition-colors hover:bg-wash/[0.04]"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm text-paper">{person.name}</span>
              <span className="block truncate text-xs text-fog">{person.companyName || person.title || "No details yet"}</span>
            </span>
            <ArrowRight className="size-3.5 shrink-0 text-fog" aria-hidden />
          </Link>
        ))}
      </div>
      <Link href="/app/people" className="mt-auto inline-flex min-h-11 items-center text-xs text-ember hover:underline">View all people</Link>
    </HomeTile>
  );
}
