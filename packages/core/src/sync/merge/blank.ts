/**
 * "This side said nothing about this field."
 *
 * The distinction the FIRST-LINK merge rests on. With no base, a value present
 * on one side and absent on the other is not two parties disagreeing — it is
 * one speaking and the other silent. Filling a blank invents nothing and
 * discards nothing, so it needs no user decision; two different REAL values are
 * a competing claim and must still reach the user.
 *
 * This is a volume property, not a nicety. An address book seeded from Dhaga's
 * own vCard export answers "no label" for most methods, and counting each of
 * those as a disagreement turned one first sync of a 700-contact graph into
 * 1400 conflict rows that all read "Work vs nothing" — a review queue worse
 * than the problem the bulk seed exists to solve.
 *
 * Emptiness includes whitespace: a label of " " is silence dressed as a value.
 */
export function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  return typeof value === "string" && value.trim().length === 0;
}
