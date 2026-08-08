/**
 * The legal-entity and support details the Terms / Refunds / Contact pages
 * print. One file so there is exactly one place to correct them.
 *
 * These render verbatim on public pages and a payment gateway reads them during
 * onboarding — Razorpay requires a reachable business name, address, phone and
 * support email before it approves live mode. Anything still marked `TODO` will
 * be shown to a customer exactly as written.
 */

export const LEGAL_ENTITY = {
  /** The registered name that appears on the invoice and the bank account. */
  name: "Ekasmi TechLabs Pvt. Ltd.",
  address:
    "I-706, R10, Universe Avenue, Life Republic, Kolte Patil, Hinjewadi, Pune 411067, Maharashtra, India",
  supportEmail: "contact@ekasmi.com",
  phone: "+91 98761 17457",
  /**
   * When that number is answered, e.g. "Monday to Friday, 10:00–18:00 IST".
   * `null` until someone decides — the Contact page then prints the number with
   * no hours beside it, rather than a promise nobody has made. Set it and the
   * clause appears; there is no placeholder that can leak to a customer.
   */
  supportHours: null as string | null,
} as const;

/** The company behind Dhaga, credited in the site footer. */
export const PARENT_COMPANY = {
  label: "ekasmi.com",
  url: "https://ekasmi.com",
} as const;

/** How long we promise to take on a first reply. Quoted on /contact and used as
 *  the outer bound in the refund timeline, so the two cannot drift. */
export const SUPPORT_FIRST_REPLY_DAYS = 2;

/** Working days from an approved refund to the money leaving our side. The
 *  processor's own settlement time sits on top of this and is stated separately
 *  — promising an end-to-end date we don't control is how refund disputes start. */
export const REFUND_PROCESSING_DAYS = 7;
