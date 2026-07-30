import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HomeTile } from "@/components/app/home/HomeTile";
import { Badge } from "@/components/ui/badge";
import { HOME_PREVIEW_LIMIT, RECENT_REASON_LABELS } from "@/utils/constants/app";
import type { RecentContactListItem } from "@/lib/repo/contacts";

/** Home's "Recent people" bento tile — most recently TOUCHED first, each row
 *  tagged with why it's here ("recently added" = just captured, "recently
 *  interacted" = a note, an event scan or a reach-out since). Each row links
 *  through to the person's full detail page. */
export function HomeOverview({ people }: { people: RecentContactListItem[] }): React.ReactElement {
  return (
    <HomeTile title="Recent people" viewAll={{ href: "/app/people", label: "View all people" }}>
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
            {/* The badge keeps its natural width and the name truncates into
                whatever is left — at 375px "recently interacted" is the widest
                the row gets, and it must stay on one line to stay readable. */}
            <span className="flex shrink-0 items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wide text-fog">
                {RECENT_REASON_LABELS[person.reason]}
              </Badge>
              <ArrowRight className="size-3.5 text-fog" aria-hidden />
            </span>
          </Link>
        ))}
      </div>
    </HomeTile>
  );
}
