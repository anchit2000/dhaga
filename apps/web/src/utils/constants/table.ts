export const TABLE_PAGE_SIZES = [10, 25, 50] as const;
export const DEFAULT_TABLE_PAGE_SIZE = 10;
export const TABLE_FILTER_OPTION_LIMIT = 200;
export const USER_ROLE_OPTIONS = ["admin", "user"];
export const SUBSCRIPTION_PLAN_OPTIONS = ["pro", "power"];
export const SUBSCRIPTION_STATUS_OPTIONS = ["active", "past_due", "canceled", "incomplete"];
export const ACCESS_REQUEST_STATUS_OPTIONS = ["pending", "approved", "rejected"];

/**
 * Settle time for a list's client-side search box. These lists filter in
 * memory over an already-loaded set, so this only stops the row array being
 * rebuilt on every keystroke — it is not hiding a network round trip. Shared by
 * the tasks board and the calendar filter bar so the two feel the same.
 */
export const LIST_SEARCH_DEBOUNCE_MS = 200;
