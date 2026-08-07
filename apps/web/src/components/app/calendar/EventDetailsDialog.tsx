"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  completeCalendarFollowUpAction,
  dismissFollowUpAction,
} from "@/lib/actions/follow-ups";
import { formatFullDueDate } from "@/utils/format-date";
import { companyFilteredHref } from "@/utils/company-href";
import type { FollowUpOutcome } from "./event-map";

/** The subset of a calendar event the details dialog renders and acts on. */
export type SelectedFollowUp = {
  id: string;
  contactId: string | null;
  contactName: string | null;
  companyId: string | null;
  companyName: string | null;
  associationLabel: string;
  action: string;
  dueDate: string | null;
  status: "open" | "done";
};

type ActionKind = FollowUpOutcome["kind"];

/** Parse the date-only string as LOCAL (parseISO), so the label matches the
 *  grid cell the event sits in rather than shifting a day across UTC.
 *  "Unscheduled" — not "No due date" — because that is the tray this item is
 *  sitting in, and it is a state the user can fix by dragging it onto a day. */
function dueLabel(dueDate: string | null): string {
  if (!dueDate) return "Unscheduled";
  return formatFullDueDate(new Date(dueDate));
}

/**
 * Details for a clicked follow-up, from the grid or from an Unscheduled tray
 * chip (whose action text the chip itself truncates). Open contact links out;
 * Mark done / Dismiss fire the existing server actions (FormData shape, they
 * throw on failure), then hand the outcome back to the board. Controlled purely
 * by `selected` being non-null.
 *
 * A COMPLETED follow-up is read-only: no Mark done on work already done, and no
 * Dismiss either — the row is finished, not pending. It gets Close instead.
 */
export function EventDetailsDialog({
  selected,
  onOpenChange,
  onResolved,
}: {
  selected: SelectedFollowUp | null;
  onOpenChange: (open: boolean) => void;
  onResolved: (id: string, outcome: FollowUpOutcome) => void;
}) {
  const [pending, setPending] = useState<ActionKind | null>(null);

  async function resolve(kind: ActionKind): Promise<void> {
    if (!selected) return;
    setPending(kind);
    try {
      const data = new FormData();
      data.set("followUpId", selected.id);
      data.set("contactId", selected.contactId ?? "");
      data.set("expectedDueDate", selected.dueDate ?? "");
      let advancedTo: string | null = null;
      if (kind === "done") {
        advancedTo = (await completeCalendarFollowUpAction(data)).advancedTo;
      } else {
        await dismissFollowUpAction(data);
      }
      onResolved(selected.id, { kind, advancedTo });
      onOpenChange(false);
      toast.success(advancedTo
        ? `Next occurrence: ${dueLabel(advancedTo)}`
        : kind === "done" ? "Marked as done." : "Follow-up dismissed.");
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
            <DialogTitle>{selected.associationLabel}</DialogTitle>
            <DialogDescription>
              {selected.status === "done" ? "Done · " : ""}
              {dueLabel(selected.dueDate)}
            </DialogDescription>
            <p className="text-sm leading-relaxed text-paper">{selected.action}</p>
            <DialogFooter className="sm:justify-between">
              {selected.contactId ? <Button
                variant="ghost"
                size="sm"
                className="min-h-11"
                render={<Link href={`/app/people/${selected.contactId}`} />}
              >
                Open contact
              </Button> : selected.companyId && selected.companyName ? <Button variant="ghost" size="sm" className="min-h-11"
                render={<Link href={companyFilteredHref(selected.companyName)} />}>Open company</Button> : <span />}
              {selected.status === "done" ? (
                <Button variant="outline" size="sm" className="min-h-11" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              ) : (
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-11"
                    loading={pending === "dismiss"}
                    disabled={pending !== null}
                    onClick={() => resolve("dismiss")}
                  >
                    Dismiss
                  </Button>
                  <Button
                    size="sm"
                    className="min-h-11"
                    loading={pending === "done"}
                    disabled={pending !== null}
                    onClick={() => resolve("done")}
                  >
                    Mark done
                  </Button>
                </div>
              )}
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
