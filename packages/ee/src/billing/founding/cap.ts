/**
 * How many Founding Pro seats exist, ever. A constant and NOT an env var, for
 * the same reason the display prices are constants: the number is printed on a
 * public page as a promise, and an env-overridable promise is one a deploy can
 * quietly break.
 *
 * Mirrored in apps/web only as COPY (utils/constants/landing/pricing/plans.ts
 * renders whatever the gate reports). THIS is the number that is enforced.
 */
export const FOUNDING_SEAT_CAP = 500;

/** Thrown when checkout is asked for a founding seat and there are none left.
 *  Distinct from a generic checkout failure so the route can answer "sold out"
 *  — which the buyer can act on — instead of "something went wrong". */
export class FoundingSoldOutError extends Error {
  constructor() {
    super("All founding seats have been claimed.");
    this.name = "FoundingSoldOutError";
  }
}
