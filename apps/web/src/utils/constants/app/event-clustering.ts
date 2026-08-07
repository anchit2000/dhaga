/**
 * Auto event grouping (M2, BRD §6.2): scans sharing a geohash-6 within this
 * rolling window join the same event instead of starting a new one.
 */
export const EVENT_CLUSTER_WINDOW_MS = 4 * 60 * 60 * 1000; // 4 hours

/** Name given to an event auto-created by clustering, until the user renames it. */
export const NEW_EVENT_PLACEHOLDER_NAME = "New event";
