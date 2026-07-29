"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/components/app/graph/canvas/use-is-mobile";
import type { MapPlace } from "@/types";

/** Who is at the tapped place. Bottom sheet on phones, side sheet on desktop —
 *  the same split the graph's NodePanel uses. */
export function PlaceSheet({
  place,
  onClose,
}: {
  place: MapPlace | null;
  onClose: () => void;
}): React.ReactElement | null {
  const isMobile = useIsMobile();
  if (!place) return null;

  return (
    <Sheet open onOpenChange={(open) => (open ? undefined : onClose())}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={isMobile ? "max-h-[70vh]" : undefined}
      >
        <SheetHeader>
          <SheetTitle className="truncate pr-8 text-lg">{place.label}</SheetTitle>
          <SheetDescription>
            {place.contacts.length === 1
              ? "1 contact lists this location"
              : `${place.contacts.length} contacts list this location`}
          </SheetDescription>
        </SheetHeader>

        <ul className="flex-1 divide-y divide-seam overflow-y-auto px-4 pb-6">
          {place.contacts.map((contact) => (
            <li key={contact.id}>
              <Link
                href={`/app/people/${contact.id}`}
                className="flex min-h-11 items-center justify-between gap-3 text-sm text-paper hover:text-amber"
              >
                <span className="truncate">{contact.name}</span>
                <ChevronRight className="size-4 shrink-0 text-fog" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
