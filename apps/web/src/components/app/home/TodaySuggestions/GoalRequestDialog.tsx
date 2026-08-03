"use client";

import { GOAL_REQUEST_FREE_LINE, goalRequestCostLine } from "./labels";
import { AiGateNotice } from "@/components/app/AiGateNotice";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAsyncData } from "@/lib/data";
import { goalMatchOfferAction } from "@/lib/actions/goals";
import type { ReactElement } from "react";
import type { GoalMatchOffer } from "@/lib/actions/goals";

/**
 * The price, before anything is spent.
 *
 * Matching a goal is free overnight and costs credits on demand, so the two
 * numbers have to be on screen together — otherwise "Request now" is a button
 * that quietly bills you. Both come from the SERVER when the dialog opens
 * (goalMatchOfferAction): the credit price so the client never carries a copy
 * of the pricing table, and the credit gate so a user with nothing left is told
 * here rather than after a click that could only fail.
 *
 * Advisory only — `assertAiBudget` inside the resolve is still the enforcement.
 */
export function GoalRequestDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Runs the request. The strip owns it, because the in-flight state outlives
   *  this dialog — it closes the moment the user confirms. */
  onConfirm: () => void;
}): ReactElement {
  // Lazy (`enabled: open`) so a home page with a goal on it fetches nothing
  // until the user actually asks what this costs.
  const { data, isLoading } = useAsyncData<GoalMatchOffer>({
    key: ["goal-match-offer"],
    enabled: open,
    fetcher: () => goalMatchOfferAction(),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>Match people now?</DialogTitle>
        <DialogDescription>
          {data ? goalRequestCostLine(data.credits) : "Checking what this costs…"}{" "}
          {GOAL_REQUEST_FREE_LINE}
        </DialogDescription>
        {data?.gate ? <AiGateNotice reason={data.gate} /> : null}
        <DialogFooter>
          <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>
            Wait for tonight
          </Button>
          <Button
            className="min-h-11"
            onClick={onConfirm}
            loading={isLoading}
            disabled={!data || data.gate !== null}
          >
            {data?.gate ? "Out of AI credits" : "Request now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
