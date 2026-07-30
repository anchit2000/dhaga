"use client";

import * as React from "react";
import { ActionForm } from "@/components/app/ActionForm";
import { SubmitButton } from "@/components/app/SubmitButton";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setPromotionAction } from "@/lib/actions/admin/ai-budget";
import type { AiPromotion } from "@/types";

/** First instant of next month — the natural end of a "this month" promotion,
 *  and the default so the common case is one click. */
function startOfNextMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

/**
 * The generous month: "everyone gets 1000 credits this month". An instance-wide
 * allowance with a window, which REPLACES the plan/env ceiling while it runs and
 * then stops applying on its own — expiry is compared at read time, so nobody has
 * to remember to undo it. A per-user override still wins over it (that is an
 * admin's explicit decision about one account).
 */
export function PromotionCard({
  promotion,
  active,
}: {
  promotion: AiPromotion | null;
  active: boolean;
}): React.JSX.Element {
  const [startsAt, setStartsAt] = React.useState<Date | null>(
    promotion ? new Date(promotion.startsAt) : new Date(),
  );
  const [endsAt, setEndsAt] = React.useState<Date | null>(
    promotion ? new Date(promotion.endsAt) : startOfNextMonth(),
  );

  return (
    <ActionForm
      action={setPromotionAction}
      errorMessage="Couldn't save the promotion."
      className="space-y-4 rounded-2xl border border-seam bg-panel p-5"
    >
      <div>
        <p className="text-sm font-medium text-paper">Promotional month</p>
        <p className="mt-1 text-sm text-fog">
          {promotion
            ? active
              ? "Running now — every user's monthly allowance is the number below."
              : "Saved but not running: today is outside its window."
            : "Lift every user on this instance to one allowance for a window. Clear the credits field to end it."}{" "}
          Ends at the <span className="text-paper">start</span> of the end date, so pick the
          first day it should no longer apply.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="promo-credits">Credits for everyone</Label>
          <Input
            id="promo-credits"
            name="credits"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            defaultValue={promotion?.credits ?? ""}
            placeholder="1000"
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="promo-starts">Starts</Label>
          <DatePicker id="promo-starts" name="startsAt" value={startsAt} onChange={setStartsAt} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="promo-ends">Ends</Label>
          <DatePicker id="promo-ends" name="endsAt" value={endsAt} onChange={setEndsAt} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="promo-note">Why</Label>
        <Input
          id="promo-note"
          name="note"
          defaultValue={promotion?.note ?? ""}
          placeholder="Launch month — free 1000 credits for everyone"
          className="h-11"
        />
      </div>

      <SubmitButton className="w-full sm:w-auto">Save promotion</SubmitButton>
    </ActionForm>
  );
}
