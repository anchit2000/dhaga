// Persisted, dismissible notifications feed. Split per the 150-line rule;
// import paths stay stable via this barrel: @/lib/repo/notifications.
export {
  listRecentNotifications,
  countUnreadNotifications,
  type NotificationItem,
} from "./queries";
export {
  createNotification,
  dismissNotification,
  markAllNotificationsRead,
  markNotificationRead,
  type CreateNotificationInput,
} from "./mutations";
export {
  buildJobNotification,
  countPhrase,
  type JobNotificationCopy,
  type JobOutcome,
} from "./job-copy";
export { notifyJobOutcome, type JobNotificationSubject } from "./job-notify";
export { shouldEmailJobOutcome, type JobEmailPlan } from "./job-email";
