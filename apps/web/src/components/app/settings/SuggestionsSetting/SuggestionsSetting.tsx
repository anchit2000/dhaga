"use client";

import { useEffect, useRef } from "react";
import { ActionForm } from "@/components/app/ActionForm";
import { Input } from "@/components/ui/input";
import { SaveButton } from "@/components/app/settings/SuggestionsToggles";
import {
  setConfirmationsDigestEnabledAction,
  setDailyDigestEnabledAction,
  setMorningReminderEnabledAction,
  setSuggestionSettingsAction,
} from "@/lib/actions/suggestions";
import type { SchedulePrefs } from "@/lib/repo/suggestion-settings";
import {
  MAX_DAILY_SUGGESTION_COUNT,
  MIN_DAILY_SUGGESTION_COUNT,
} from "@/utils/constants/suggestions";
import { DigestToggle } from "./DigestToggle";

const fieldLabel = "block text-xs text-fog";
const fieldBox = "mt-1 w-full";

/** Tune the daily "reach out to N people" list + working hours + email digest. */
export function SuggestionsSetting({
  count,
  prefs,
  digestEnabled,
  confirmationsDigestEnabled,
  reminderEnabled,
}: {
  count: number;
  prefs: SchedulePrefs;
  digestEnabled: boolean;
  confirmationsDigestEnabled: boolean;
  reminderEnabled: boolean;
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

      <ActionForm
        action={setSuggestionSettingsAction}
        errorMessage="Couldn't save your suggestion settings — try again."
        className="space-y-4"
      >
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
      </ActionForm>

      <DigestToggle
        enabled={digestEnabled}
        action={setDailyDigestEnabledAction}
        label="Daily email digest"
        title="Daily email digest"
        description="Get the morning list by email. Requires email to be configured on your server."
      />

      <DigestToggle
        enabled={confirmationsDigestEnabled}
        action={setConfirmationsDigestEnabledAction}
        label="Confirmations digest"
        title="Confirmations digest"
        description="Email a summary of pending confirmations waiting for your review. Requires email to be configured on your server."
      />

      <DigestToggle
        enabled={reminderEnabled}
        action={setMorningReminderEnabledAction}
        label="Morning follow-up reminders"
        title="Morning follow-up reminders"
        description="A daily nudge to open Dhaga when you have follow-ups or check-ins waiting. Requires email to be configured on your server."
      />
    </section>
  );
}
