"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AttachTargetSearch } from "@/components/app/AttachTargetSearch";
import { attachContactToEventAction } from "@/lib/actions/event-membership";
import type { GraphTarget } from "@/lib/repo/graph-data";

/**
 * Contact-page control: search existing events and add this person to one —
 * the "same person at multiple events" path. Current events already show as
 * chips above; the picker excludes them and the page re-renders on attach.
 */
export function AddToEventPicker({
  contactId,
  currentEventIds,
}: {
  contactId: string;
  currentEventIds: string[];
}): React.ReactElement {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const excludeIds = useMemo(() => new Set(currentEventIds), [currentEventIds]);

  function attach(target: GraphTarget): void {
    startTransition(async () => {
      const result = await attachContactToEventAction(target.id, contactId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Added to ${target.label}.`);
      router.refresh();
    });
  }

  return (
    <AttachTargetSearch
      kind="event"
      excludeIds={excludeIds}
      onPick={attach}
      placeholder="Add to an event — search…"
      disabled={pending}
    />
  );
}
