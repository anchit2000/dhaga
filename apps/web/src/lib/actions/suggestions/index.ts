/**
 * Settings-page suggestion/digest/important-date server actions. Split per the
 * 150-line rule: ./helpers (plain sync clamp/numberField — a "use server" file
 * may only export async actions), ./schedule (daily count + working-hours
 * window + timezone), ./digest (daily/confirmations digest, morning reminder,
 * job-email opt-in), ./important-dates (reminders toggle + lead days). Each
 * action file keeps its own "use server" directive; this barrel is undirected
 * and just forwards the action references. Import path stays
 * `@/lib/actions/suggestions`.
 */
export { setSuggestionSettingsAction, setTimezoneAction } from "./schedule";
export {
  setConfirmationsDigestEnabledAction,
  setDailyDigestEnabledAction,
  setJobEmailNotificationsEnabledAction,
  setMorningReminderEnabledAction,
} from "./digest";
export {
  setImportantDateLeadDaysAction,
  setImportantDateRemindersEnabledAction,
} from "./important-dates";
