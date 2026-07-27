"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { completeFollowUpAction, dismissFollowUpAction } from "@/lib/actions/follow-ups";

/** The subset of a calendar event the details dialog renders and acts on. */
export type SelectedFollowUp = {
  id: string;
  contactId: string;
  contactName: string;
  action: string;
  dueDate: string | null;
};

type ActionKind = "done" | "dismiss";

/** Parse the date-only string as LOCAL (parseISO), so the label matches the
 *  grid cell the event sits in rather than shifting a day across UTC. */
function dueLabel(dueDate: string | null): string {
  if (!dueDate) return "No due date";
  return format(parseISO(dueDate), "EEEE, d MMMM yyyy");
}

/**
 * Details for a clicked follow-up. Open contact links out; Mark done / Dismiss
 * fire the existing server actions (FormData shape, they throw on failure), then
 * hand the id back to the board (`onResolved`) so it removes the event from the
 * calendar, and close. Controlled purely by `selected` being non-null.
 */
export function EventDetailsDialog({
  selected,
  onOpenChange,
  onResolved,
}: {
  selected: SelectedFollowUp | null;
  onOpenChange: (open: boolean) => void;
  onResolved: (id: string) => void;
}) {
  const [pending, setPending] = useState<ActionKind | null>(null);

  async function resolve(
    kind: ActionKind,
    action: (formData: FormData) => Promise<void>,
  ): Promise<void> {
    if (!selected) return;
    setPending(kind);
    try {
      const data = new FormData();
      data.set("followUpId", selected.id);
      data.set("contactId", selected.contactId);
      await action(data);
      onResolved(selected.id);
      onOpenChange(false);
      toast.success(kind === "done" ? "Marked as done." : "Follow-up dismissed.");
    } catch {
      toast.error("Couldn't update that follow-up — try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <Dialog open={selected !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {selected ? (
          <>
            <DialogTitle>{selected.contactName}</DialogTitle>
            <DialogDescription>{dueLabel(selected.dueDate)}</DialogDescription>
            <p className="text-sm leading-relaxed text-paper">{selected.action}</p>
            <DialogFooter className="sm:justify-between">
              <Button
                variant="ghost"
                size="sm"
                render={<Link href={`/app/people/${selected.contactId}`} />}
              >
                Open contact
              </Button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  size="sm"
                  loading={pending === "dismiss"}
                  disabled={pending !== null}
                  onClick={() => resolve("dismiss", dismissFollowUpAction)}
                >
                  Dismiss
                </Button>
                <Button
                  size="sm"
                  loading={pending === "done"}
                  disabled={pending !== null}
                  onClick={() => resolve("done", completeFollowUpAction)}
                >
                  Mark done
                </Button>
              </div>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
