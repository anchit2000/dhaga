/**
 * Hosted pending-approval gate ("payment is the invite"). Anyone can sign up;
 * a hosted account waits on /pending until an admin approves it or a payment
 * is confirmed. Inert on a core-only self-host — see lib/hosted/gate.
 */
export const PENDING_PATH = "/pending";

/** Thrown by the auth guards, so it may be surfaced to the user verbatim. */
export const PENDING_APPROVAL_MESSAGE =
  "Your Dhaga account is waiting for approval — you'll get in as soon as it's granted.";
