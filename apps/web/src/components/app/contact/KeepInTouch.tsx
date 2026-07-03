"use client";

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
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber/40 px-3 py-1.5 text-xs text-amber transition-colors hover:bg-amber/10 disabled:pointer-events-none"
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
          defaultValue={everyDays ? String(everyDays) : ""}
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
