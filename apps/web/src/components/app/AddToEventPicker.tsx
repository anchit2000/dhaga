"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EntityCombobox } from "@/components/app/EntityCombobox";
import {
  attachContactToEventAction,
  createEventAndAttachAction,
} from "@/lib/actions/event-membership";
import type { GraphTarget } from "@/lib/repo/graph-data";

/**
 * Contact-page control: a compact "Add to group" button that opens a searchable
 * dropdown of existing groups (with a "Create group" affordance), instead of a
 * bare text box. Current groups already show as chips above; the picker
 * excludes them and the page re-renders on attach.
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

  function createGroup(name: string): void {
    startTransition(async () => {
      const result = await createEventAndAttachAction(name, contactId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Added to ${name}.`);
      router.refresh();
    });
  }

  return (
    <EntityCombobox
      kinds={["event"]}
      excludeIds={excludeIds}
      onSelect={attach}
      onCreate={createGroup}
      createLabel="Create group"
      placeholder="Search groups…"
      triggerLabel="Add to group"
      clearOnSelect
      disabled={pending}
    />
  );
}
