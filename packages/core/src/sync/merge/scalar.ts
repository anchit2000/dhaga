/**
 * Scalar-field half of the three-way merge (name, nickname, title, company).
 *
 * Ownership is derived, not stored: whichever side diverged from the base is
 * the side that edited the field, and that value wins. No clocks are involved,
 * because no platform exposes per-field modification times — only per-record.
 */
export function mergeScalarField(
  hasBase: boolean,
  base: string | null | undefined,
  local: string | null,
  remote: string | null,
): { value: string | null; conflict: boolean } {
  const l = local ?? null;
  const r = remote ?? null;
  if (l === r) return { value: l, conflict: false };
  // First link: there is no base, so we cannot tell who edited what. Keep
  // Dhaga's value, push nothing, and let the user resolve it — adopting the
  // remote here would silently rewrite curated data the moment they connect.
  if (!hasBase) return { value: l, conflict: true };
  const b = base ?? null;
  if (r === b) return { value: l, conflict: false }; // only Dhaga moved → push out
  if (l === b) return { value: r, conflict: false }; // only the phone moved → pull in
  return { value: r, conflict: true }; // both moved → the phone's edit survives
}
