import {
  getDailySuggestionCount,
  getImportantDateLeadDays,
  getImportantDateRemindersEnabled,
  getSchedulePrefs,
  isConfirmationsDigestEnabled,
  isDailyDigestEnabled,
  isJobEmailNotificationsEnabled,
  isMorningReminderEnabled,
} from "@/lib/repo/suggestion-settings";
import { SuggestionsSetting } from "@/components/app/settings/SuggestionsSetting";
import { ImportantDatesSetting } from "@/components/app/settings/ImportantDatesSetting";
import { TimezoneSetting } from "@/components/app/settings/TimezoneSetting";

export async function SuggestionsSection() {
  // One more pair of reads on the SAME request-pinned connection these settings
  // lookups already share — not a new getDb() fan-out.
  const [
    count,
    prefs,
    digestEnabled,
    confirmationsDigestEnabled,
    reminderEnabled,
    jobEmailEnabled,
    importantDateRemindersEnabled,
    importantDateLeadDays,
  ] = await Promise.all([
    getDailySuggestionCount(),
    getSchedulePrefs(),
    isDailyDigestEnabled(),
    isConfirmationsDigestEnabled(),
    isMorningReminderEnabled(),
    isJobEmailNotificationsEnabled(),
    getImportantDateRemindersEnabled(),
    getImportantDateLeadDays(),
  ]);
  return (
    <>
      <SuggestionsSetting
        count={count}
        prefs={prefs}
        digestEnabled={digestEnabled}
        confirmationsDigestEnabled={confirmationsDigestEnabled}
        reminderEnabled={reminderEnabled}
        jobEmailEnabled={jobEmailEnabled}
      />
      {/* Same getSchedulePrefs() read the suggestions card above already awaited
          — the zone lives in that blob, so mounting it here costs no extra query. */}
      <TimezoneSetting timezone={prefs.timezone} />
      <ImportantDatesSetting
        remindersEnabled={importantDateRemindersEnabled}
        leadDays={importantDateLeadDays}
      />
    </>
  );
}
