"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HomeTile } from "@/components/app/home/HomeTile";
import { Button } from "@/components/ui/button";
import { HOME_PREVIEW_LIMIT } from "@/utils/constants/app";
import type { ContactListItem } from "@/lib/repo/contacts";

/** Home's "Recent people" bento tile. ("Recent events" moved to its own row
 *  beside "Suggested groups" — see RecentEventsTile.) */
export function HomeOverview({
  people,
  className,
  onSelectContact,
}: {
  people: ContactListItem[];
  /** Grid-span classes — HomeDashboard sizes it to close the bento's last row. */
  className?: string;
  onSelectContact: (id: string) => void;
}) {
  return (
    <HomeTile title="Recent people" className={className}>
      <div className="space-y-1">
        {people.length === 0 ? (
          <div className="py-4">
            <p className="text-sm text-paper">No one captured yet.</p>
            <p className="mt-1 text-xs text-fog">Scan a card, paste an intro, or speak a note — people you capture land here.</p>
          </div>
        ) : people.slice(0, HOME_PREVIEW_LIMIT).map((person) => (
          <Button key={person.id} render={<div />} variant="ghost" onClick={() => onSelectContact(person.id)} className="flex h-auto min-h-11 w-full items-center justify-between gap-3 rounded-lg px-2 text-left text-sm font-normal normal-case transition-colors hover:bg-wash/[0.04]">
            <span className="min-w-0"><span className="block truncate text-sm text-paper">{person.name}</span><span className="block truncate text-xs text-fog">{person.companyName || person.title || "No details yet"}</span></span>
            <ArrowRight className="size-3.5 shrink-0 text-fog/60" />
          </Button>
        ))}
      </div>
      <Link href="/app/people" className="mt-auto inline-flex min-h-11 items-center text-xs text-ember hover:underline">View all people</Link>
    </HomeTile>
  );
}
