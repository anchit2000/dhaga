/** Job statuses the poller still watches: pending or running. Shared by the
 *  recent-jobs read and the stuck-job reaper. */
export const ACTIVE = ["pending", "running"] as const;
