"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { markReachedOutAction, setCadenceAction } from "@/lib/actions/reminders";
import { ActionForm } from "@/components/app/ActionForm";
import { useOptimisticToggle } from "@/lib/hooks/useOptimisticToggle";
import { Select } from "@/components/ui/select";
import { CADENCE_OPTIONS } from "@/utils/constants/app";

function SmallSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber/40 px-3 py-1.5 text-xs text-ember transition-colors hover:bg-amber/10 disabled:pointer-events-none"
    >
      {pending ? <Loader2 className="size-3 animate-spin" /> : null}
      {label}
    </button>
  );
}

/** Idea #2: keep-in-touch cadence + "I reached out" reset. */
export function KeepInTouch({
  contactId,
  everyDays,
  lastTouch,
  due,
}: {
  contactId: string;
  everyDays: number | null;
  lastTouch: string;
  due: boolean;
}) {
  // Optimistic cadence: the picker flips to the chosen value instantly on
  // change (no Save round-trip) and reverts — with a toast — only if the server
  // rejects it. useOptimistic re-syncs to the fresh `everyDays` prop after each
  // revalidation and when navigating between contacts reuses this instance, so
  // the manual state-sync the controlled <select> used to need is gone. The
  // status line below still reads the server truth (`everyDays`), catching up
  // when the revalidated data lands.
  const { value: days, pending, set } = useOptimisticToggle<string>({
    value: everyDays ? String(everyDays) : "",
    mutate: async (next) => {
      const formData = new FormData();
      formData.set("contactId", contactId);
      formData.set("days", next);
      await setCadenceAction(formData);
    },
    errorMessage: "Couldn't update the reminder — try again.",
  });

  return (
    <div className="space-y-3 rounded-2xl border border-seam bg-panel p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-paper">Keep in touch</p>
        <p className="text-xs text-fog">
          {everyDays
            ? due
              ? `Overdue — last touch ${lastTouch}.`
              : `On track — last touch ${lastTouch}.`
            : "No reminder set."}
        </p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Select
          value={days}
          onChange={(event) => set(event.target.value)}
          disabled={pending}
          className="h-8 w-36 text-xs"
          aria-label="Reach-out cadence"
        >
          <option value="">No reminder</option>
          {CADENCE_OPTIONS.map((option) => (
            <option key={option.days} value={option.days}>
              {option.label}
            </option>
          ))}
        </Select>
        {everyDays ? (
          <ActionForm
            action={markReachedOutAction}
            errorMessage="Couldn't update the reminder — try again."
          >
            <input type="hidden" name="contactId" value={contactId} />
            <SmallSubmit label="I reached out ✓" />
          </ActionForm>
        ) : null}
      </div>
    </div>
  );
}
