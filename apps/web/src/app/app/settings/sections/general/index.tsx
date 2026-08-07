/**
 * One async data-fetching wrapper per settings card. Each awaits only its own
 * card's query so it can stream in behind its own <Suspense> boundary — a slow
 * billing/session/calendar lookup no longer blocks the whole page. All share
 * the one request-pinned tenant connection (safe) and the memoized session.
 *
 * Split per the 150-line rule: ./profile (account/appearance/security),
 * ./billing, ./calendar-contacts (calendar + address-book sync),
 * ./suggestions (daily suggestions/timezone/important dates), ./misc
 * (card photos/voice teaching/API keys). Import path stays `./general`.
 */
export * from "./profile";
export * from "./billing";
export * from "./calendar-contacts";
export * from "./suggestions";
export * from "./misc";
