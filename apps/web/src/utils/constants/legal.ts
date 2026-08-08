/**
 * The legal-entity and support details the Terms / Refunds / Contact pages
 * print. One file so there is exactly one place to correct them.
 *
 * ⚠️ EVERY VALUE MARKED `TODO` BELOW IS A PLACEHOLDER, NOT A FACT. They are
 * rendered verbatim on public pages, and a payment gateway will read them
 * during onboarding — Razorpay in particular requires a reachable business
 * name, address, phone and support email before it will approve live mode.
 * Replace them before this ships, and re-read the page copy that quotes them.
 */

export const LEGAL_ENTITY = {
  /** TODO: the registered name that appears on the invoice and the bank account. */
  name: "TODO — registered business name",
  /** TODO: full registered address, including PIN/postal code. */
  address: "TODO — registered address",
  /** TODO: a support inbox that is actually monitored. */
  supportEmail: "TODO — support@…",
  /** TODO: a phone number reachable in the stated hours (Razorpay requires one). */
  phone: "TODO — support phone",
  /** TODO: e.g. "Monday to Friday, 10:00–18:00 IST". */
  supportHours: "TODO — support hours",
} as const;

/** How long we promise to take on a first reply. Quoted on /contact and used as
 *  the outer bound in the refund timeline, so the two cannot drift. */
export const SUPPORT_FIRST_REPLY_DAYS = 2;

/** Working days from an approved refund to the money leaving our side. The
 *  processor's own settlement time sits on top of this and is stated separately
 *  — promising an end-to-end date we don't control is how refund disputes start. */
export const REFUND_PROCESSING_DAYS = 7;
