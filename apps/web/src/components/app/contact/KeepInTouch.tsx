"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { markReachedOutAction, setCadenceAction } from "@/lib/actions/reminders";
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
  // Controlled, not defaultValue: after the save action React 19 auto-resets
  // the form, and an uncontrolled <select> can snap back to its stale mount
  // default (showing "No reminder" until a refresh) when the revalidated
  // re-render hasn't landed. A state-backed value survives the reset. Re-sync
  // during render (not an effect) whenever the server value changes — after a
  // save, or when navigating between contacts reuses this component instance.
  const serverDays = everyDays ? String(everyDays) : "";
  const [days, setDays] = useState(serverDays);
  const [seenEveryDays, setSeenEveryDays] = useState(everyDays);
  if (everyDays !== seenEveryDays) {
    setSeenEveryDays(everyDays);
    setDays(serverDays);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-seam bg-panel p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-paper">Keep in touch</p>
        <p className="text-xs text-fog">
          {everyDays
            ? due
              ? `Overdue — last touch ${lastTouch}.`
              : `On track — last touch ${lastTouch}.`
            : "No reminder set."}
        </p>
      </div>
      <form action={setCadenceAction} className="flex items-center gap-2">
        <input type="hidden" name="contactId" value={contactId} />
        <Select
          name="days"
          value={days}
          onChange={(event) => setDays(event.target.value)}
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
        <SmallSubmit label="Save" />
      </form>
      {everyDays ? (
        <form action={markReachedOutAction}>
          <input type="hidden" name="contactId" value={contactId} />
          <SmallSubmit label="I reached out ✓" />
        </form>
      ) : null}
    </div>
  );
}
