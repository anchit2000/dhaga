"use client";

import { useState, useTransition, type ReactElement } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { runAction } from "@/components/app/ActionForm";
import {
  cancelPlanAction,
  resumePlanAction,
  revertScheduledChangeAction,
} from "@/lib/actions/billing";
import { formatDate } from "@/utils/format-date";
import type { CurrentPlanState } from "@/lib/hosted/gate";

/**
 * Cancel, un-cancel, and undo a scheduled plan change — the destructive end of
 * the plan surface, so cancel goes through an explicit confirmation.
 *
 * The dialog copy differs by processor because the consequence does: Stripe can
 * un-cancel, Razorpay cannot. Telling a Razorpay customer they can change their
 * mind later, when they can't, would be the worse kind of wrong.
 */
export function PlanActions({ current }: { current: CurrentPlanState }): ReactElement {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const endsOn = current.renewsAt ? formatDate(current.renewsAt) : "your renewal date";
  const reversible = current.processor === "stripe";

  function run(action: () => Promise<void>, errorMessage: string): void {
    startTransition(async () => {
      await runAction(action, errorMessage);
      setOpen(false);
    });
  }

  if (current.cancelAtPeriodEnd) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-fog">Access ends {endsOn}.</p>
        {reversible ? (
          <Button
            size="sm"
            variant="outline"
            loading={pending}
            onClick={() => run(resumePlanAction, "Couldn't keep the plan — please try again.")}
          >
            Keep my plan
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {current.pending ? (
        <Button
          size="sm"
          variant="outline"
          loading={pending}
          onClick={() =>
            run(revertScheduledChangeAction, "Couldn't undo the scheduled change — please try again.")
          }
        >
          Undo scheduled change
        </Button>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button size="sm" variant="ghost" />}>Cancel plan</DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogTitle>Cancel your plan?</DialogTitle>
          <DialogDescription>
            You keep everything you&rsquo;ve paid for until {endsOn}, then the account drops to
            Free. Nothing is charged again and nothing is refunded.{" "}
            {reversible
              ? "You can undo this any time before that date."
              : "Razorpay can’t un-cancel a subscription, so restarting later means a new one."}
          </DialogDescription>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Keep my plan
            </Button>
            <Button
              size="sm"
              variant="destructive"
              loading={pending}
              onClick={() => run(cancelPlanAction, "Couldn't cancel — please try again.")}
            >
              Cancel at {endsOn}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
