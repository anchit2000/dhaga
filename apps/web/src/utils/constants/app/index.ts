/**
 * App-shell constants (the product UI under /app, not the landing page).
 * Split per the 150-line rule: ./nav (session cookie, nav links, recent-people
 * labels), ./ai-credits (free-tier AI cap), ./contacts (sources, card-photo
 * capture), ./follow-ups (aging + cadence), ./strength (decay/strength
 * scoring), ./watchlist (proactive-intelligence caps), ./event-clustering
 * (auto event grouping). Import path stays `@/utils/constants/app`.
 */
export * from "./nav";
export * from "./ai-credits";
export * from "./contacts";
export * from "./follow-ups";
export * from "./strength";
export * from "./watchlist";
export * from "./event-clustering";
