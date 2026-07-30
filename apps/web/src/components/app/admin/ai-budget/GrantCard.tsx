"use client";

import * as React from "react";
import { ActionForm } from "@/components/app/ActionForm";
import { SubmitButton } from "@/components/app/SubmitButton";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { grantAiCreditsAction } from "@/lib/actions/admin/ai-budget";

/** First instant of next month — an open-ended grant would re-apply every month
 *  forever, so a make-good defaults to expiring with the month it repairs. */
function startOfNextMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/**
 * Make people whole after a bug. A grant ADDS credits on top of whatever ceiling
 * the user already has — it never edits `ai_actions`, so what they actually
 * spent stays recorded and auditable, and the ledger explains the difference.
 *
 * Rendered both on the instance-wide AI credits page (userId omitted → the
 * "everyone" case is available) and on a single user's admin page (userId
 * pinned).
 */
export function GrantCard({ userId }: { userId?: string }): React.JSX.Element {
  const [endsAt, setEndsAt] = React.useState<Date | null>(startOfNextMonth());
  const scoped = Boolean(userId);

  return (
    <ActionForm
      action={grantAiCreditsAction}
      errorMessage="Couldn't grant credits."
      className="space-y-4 rounded-2xl border border-seam bg-panel p-5"
    >
      {scoped ? <input type="hidden" name="userId" value={userId} /> : null}
      <div>
        <p className="text-sm font-medium text-paper">
          {scoped ? "Grant credits to this user" : "Grant credits"}
        </p>
        <p className="mt-1 text-sm text-fog">
          Added on top of whatever cap applies. Recorded usage is never changed — a
          grant repairs the ceiling, not the history.{" "}
          {scoped ? null : "Leave the user id blank to grant to everyone."} Blank end
          date means it never expires, so it repeats every month.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {scoped ? null : (
          <div className="space-y-1.5">
            <Label htmlFor="grant-user">User id (blank = everyone)</Label>
            <Input id="grant-user" name="userId" placeholder="everyone" className="h-11" />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="grant-credits">Credits</Label>
          <Input
            id="grant-credits"
            name="credits"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            placeholder="50"
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="grant-ends">Expires</Label>
          <DatePicker
            id="grant-ends"
            name="endsAt"
            value={endsAt}
            onChange={setEndsAt}
            placeholder="Never"
            clearable
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="grant-reason">Reason (required)</Label>
        <Input
          id="grant-reason"
          name="reason"
          placeholder="Make-good for the 2026-07 extraction bug"
          className="h-11"
        />
      </div>

      <SubmitButton className="w-full sm:w-auto">Grant credits</SubmitButton>
    </ActionForm>
  );
}
