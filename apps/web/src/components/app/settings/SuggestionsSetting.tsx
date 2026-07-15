"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setDailyDigestEnabledAction, setSuggestionSettingsAction } from "@/lib/actions/suggestions";
import type { SchedulePrefs } from "@/lib/repo/suggestion-settings";
import {
  MAX_DAILY_SUGGESTION_COUNT,
  MIN_DAILY_SUGGESTION_COUNT,
} from "@/utils/constants/suggestions";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
      Save
    </Button>
  );
}

function DigestToggle({ enabled }: { enabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      role="switch"
      aria-checked={enabled}
      aria-label="Daily email digest"
      className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors disabled:opacity-60 ${
        enabled ? "border-amber/50 bg-amber/30" : "border-seam bg-wash/[0.06]"
      }`}
    >
      <span
        className={`absolute top-0.5 flex size-5.5 items-center justify-center rounded-full transition-all ${
          enabled ? "left-6 bg-amber" : "left-0.5 bg-fog/60"
        }`}
      >
        {pending ? <Loader2 className="size-3 animate-spin text-on-accent" /> : null}
      </span>
    </button>
  );
}

const fieldLabel = "block text-xs text-fog";
const fieldBox = "mt-1 w-full";

/** Tune the daily "reach out to N people" list + working hours + email digest. */
export function SuggestionsSetting({
  count,
  prefs,
  digestEnabled,
}: {
  count: number;
  prefs: SchedulePrefs;
  digestEnabled: boolean;
}) {
  const offsetRef = useRef<HTMLInputElement>(null);

  // The browser knows the user's timezone; persist it so the daily cron can
  // apply working hours in local time. getTimezoneOffset is UTC-minus-local.
  useEffect(() => {
    if (offsetRef.current) offsetRef.current.value = String(-new Date().getTimezoneOffset());
  }, []);

  return (
    <section className="space-y-5 rounded-2xl border border-seam bg-panel p-5 sm:p-6">
      <div>
        <h2 className="font-display text-lg">Daily suggestions</h2>
        <p className="mt-1 text-sm text-fog">
          How many people to suggest reaching out to each day, and the hours meeting times are proposed
          within. People are spread across the week so no day gets crowded.
        </p>
      </div>

      <form action={setSuggestionSettingsAction} className="space-y-4">
        <input ref={offsetRef} type="hidden" name="utcOffsetMinutes" defaultValue={prefs.utcOffsetMinutes} />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <label className={fieldLabel}>
            People / day
            <Input
              className={fieldBox}
              name="count"
              type="number"
              min={MIN_DAILY_SUGGESTION_COUNT}
              max={MAX_DAILY_SUGGESTION_COUNT}
              defaultValue={count}
            />
          </label>
          <label className={fieldLabel}>
            Work start
            <Input className={fieldBox} name="startHour" type="number" min={0} max={23} defaultValue={prefs.startHour} />
          </label>
          <label className={fieldLabel}>
            Work end
            <Input className={fieldBox} name="endHour" type="number" min={1} max={24} defaultValue={prefs.endHour} />
          </label>
          <label className={fieldLabel}>
            Busy day at
            <Input
              className={fieldBox}
              name="overloadThreshold"
              type="number"
              min={1}
              max={24}
              defaultValue={prefs.overloadThreshold}
            />
          </label>
        </div>
        <SaveButton />
      </form>

      <form action={setDailyDigestEnabledAction} className="flex items-start justify-between gap-4 border-t border-seam pt-4">
        <input type="hidden" name="enabled" value={digestEnabled ? "off" : "on"} />
        <div>
          <p className="text-sm font-medium text-paper">Daily email digest</p>
          <p className="mt-1 text-sm text-fog">
            Get the morning list by email. Requires email to be configured on your server.
          </p>
        </div>
        <DigestToggle enabled={digestEnabled} />
      </form>
    </section>
  );
}
