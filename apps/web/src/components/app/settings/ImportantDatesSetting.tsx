"use client";

import { ActionForm } from "@/components/app/ActionForm";
import { Input } from "@/components/ui/input";
import { SaveButton } from "@/components/app/settings/SuggestionsToggles";
import { DigestToggle } from "@/components/app/settings/SuggestionsSetting";
import {
  setImportantDateLeadDaysAction,
  setImportantDateRemindersEnabledAction,
} from "@/lib/actions/suggestions";
import {
  IMPORTANT_DATE_LEAD_DAYS_MAX,
  IMPORTANT_DATE_LEAD_DAYS_MIN,
} from "@/utils/constants/important-dates";

// Same two field classes the sibling suggestions card defines locally — kept
// module-local there and here so both cards' inputs line up without promoting
// a pair of Tailwind strings into shared constants.
const fieldLabel = "block text-xs text-fog";
const fieldBox = "mt-1 w-full";

/**
 * Birthday / anniversary reminders. Its own card rather than a fifth cell in the
 * suggestions grid: the lead time belongs to important dates, not to the daily
 * reach-out volume, and this section is the anchor the onboarding tour points at
 * (`data-tour="notifications"`) when it asks the user to make an explicit choice
 * about reminder emails.
 */
export function ImportantDatesSetting({
  remindersEnabled,
  leadDays,
}: {
  remindersEnabled: boolean;
  leadDays: number;
}) {
  return (
    <section
      data-tour="notifications"
      className="scroll-mt-20 space-y-5 rounded-2xl border border-seam bg-panel p-5 sm:p-6"
    >
      <div>
        <h2 className="font-display text-lg">Birthdays &amp; anniversaries</h2>
        <p className="mt-1 text-sm text-fog">
          Dates you have saved on a contact. Choose how far ahead one counts as upcoming, and
          whether Dhaga emails you before it lands.
        </p>
      </div>

      <ActionForm
        action={setImportantDateLeadDaysAction}
        errorMessage="Couldn't save your reminder lead time — try again."
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <label className={fieldLabel}>
            Days ahead
            <Input
              className={fieldBox}
              name="leadDays"
              type="number"
              min={IMPORTANT_DATE_LEAD_DAYS_MIN}
              max={IMPORTANT_DATE_LEAD_DAYS_MAX}
              defaultValue={leadDays}
            />
          </label>
        </div>
        <SaveButton />
      </ActionForm>

      <DigestToggle
        enabled={remindersEnabled}
        action={setImportantDateRemindersEnabledAction}
        label="Birthday and anniversary reminders"
        title="Birthday and anniversary reminders"
        description="Email me before a saved birthday or anniversary, using the lead time above. Off unless you turn it on, and it needs email configured on your server."
      />
    </section>
  );
}
