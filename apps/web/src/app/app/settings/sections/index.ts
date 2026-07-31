/**
 * Per-card async data-fetching wrappers for /app/settings, split so no single
 * file crosses the 150-line limit: the pre-existing account/capture/calendar/
 * suggestions wrappers live in ./general, the inbound-messaging wrapper in
 * ./messaging, the AI-credits ledger in ./credits. This index re-exports them
 * all so `./sections` stays the one import surface the page reads from.
 */
export * from "./credits";
export * from "./general";
export * from "./messaging";
