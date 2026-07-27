/**
 * Per-card async data-fetching wrappers for /app/settings, split so no single
 * file crosses the 150-line limit: the pre-existing account/capture/calendar/
 * suggestions wrappers live in ./general, the inbound-messaging wrapper in
 * ./messaging. This index re-exports both so `./sections` stays the one import
 * surface the page reads from.
 */
export * from "./general";
export * from "./messaging";
