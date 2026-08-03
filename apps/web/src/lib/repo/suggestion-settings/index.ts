// Per-user suggestion/scheduling scalars + email preferences. Split per the
// 150-line rule; import paths stay stable via this barrel:
// @/lib/repo/suggestion-settings.
export { getSuggestionSettings, type SuggestionSettings } from "./bundle";
export {
  getDailySuggestionCount,
  getSchedulePrefs,
  setDailySuggestionCount,
  setSchedulePrefs,
  type SchedulePrefs,
} from "./schedule";
export {
  getImportantDateLeadDays,
  getImportantDateRemindersEnabled,
  getJobEmailLastSentAt,
  isConfirmationsDigestEnabled,
  isDailyDigestEnabled,
  isJobEmailNotificationsEnabled,
  isMorningReminderEnabled,
  setConfirmationsDigestEnabled,
  setDailyDigestEnabled,
  setImportantDateLeadDays,
  setImportantDateRemindersEnabled,
  setJobEmailLastSentAt,
  setJobEmailNotificationsEnabled,
  setMorningReminderEnabled,
} from "./emails";
