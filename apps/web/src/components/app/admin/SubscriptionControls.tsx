"use client";

import * as React from "react";
import { setSubscriptionAction, setAiCreditsAction } from "@/lib/actions/admin/subscriptions";
import { ActionForm } from "@/components/app/ActionForm";
import { SubmitButton } from "@/components/app/SubmitButton";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface SubscriptionControlsProps {
  userId: string;
  currentPlan: "free" | "pro" | "power" | "lifetime";
  currentExpiry: Date | null;
  currentCredits: number | null;
}

/**
 * Admin-only controls to comp a user's subscription and AI allowance. A client
 * component (the DatePicker is client) wrapping plain server-action `<form>`s —
 * the actions re-check `isAdmin` server-side, so the client boundary carries no
 * trust.
 */
export function SubscriptionControls({
  userId,
  currentPlan,
  currentExpiry,
  currentCredits,
}: SubscriptionControlsProps): React.JSX.Element {
  const [expiry, setExpiry] = React.useState<Date | null>(currentExpiry);

  return (
    <div className="space-y-6">
      <ActionForm
        action={setSubscriptionAction}
        errorMessage="Couldn't update the subscription."
        className="rounded-2xl border border-seam bg-panel p-5 space-y-4"
      >
        <input type="hidden" name="userId" value={userId} />
        <div>
          <p className="text-sm font-medium text-paper">Manage subscription</p>
          <p className="mt-1 text-sm text-fog">Comp a plan directly, no Stripe. An expiry lapses paid access.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="plan">Plan</Label>
            <Select id="plan" name="plan" defaultValue={currentPlan}>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="power">Power</option>
              <option value="lifetime">Lifetime</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expiry">Expiry</Label>
            <DatePicker
              id="expiry"
              name="expiry"
              value={expiry}
              onChange={setExpiry}
              placeholder="No expiry"
            />
          </div>
        </div>

        <SubmitButton className="w-full sm:w-auto">Save subscription</SubmitButton>
      </ActionForm>

      <ActionForm
        action={setAiCreditsAction}
        errorMessage="Couldn't set AI credits."
        className="rounded-2xl border border-seam bg-panel p-5 space-y-4"
      >
        <input type="hidden" name="userId" value={userId} />
        <div>
          <p className="text-sm font-medium text-paper">AI credits</p>
          <p className="mt-1 text-sm text-fog">
            Monthly cloud-AI credits this user gets, overriding their plan allowance and
            everything else. Blank or 0 clears it and they fall back to their plan.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="credits">Monthly AI credits</Label>
          <Input
            id="credits"
            name="credits"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            defaultValue={currentCredits ?? ""}
            placeholder="0"
            className="h-11 sm:max-w-40"
          />
        </div>

        <SubmitButton className="w-full sm:w-auto">Save credits</SubmitButton>
      </ActionForm>
    </div>
  );
}
