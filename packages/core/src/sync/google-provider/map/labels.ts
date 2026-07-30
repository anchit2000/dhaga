/**
 * Label translation, shared by both directions of the People mapping.
 *
 * Google stores a lowercase enum in `type` and renders a human string in
 * `formattedType`. We read the human one (it is what the user actually sees in
 * Google Contacts) and write the enum one, because People rejects an unknown
 * `type` outright — so an unrecognised Dhaga label degrades to "other" rather
 * than failing the whole write.
 */

/** Google accepts only these on most typed fields; anything else 400s. */
const KNOWN_TYPES = new Set(["home", "work", "mobile", "other"]);

export function toGoogleType(label: string | null): string | undefined {
  if (!label) return undefined;
  const lower = label.trim().toLowerCase();
  return KNOWN_TYPES.has(lower) ? lower : "other";
}

export function fromGoogleLabel(entry: { type?: string; formattedType?: string }): string | null {
  return entry.formattedType?.trim() || entry.type?.trim() || null;
}

export function isBirthday(label: string): boolean {
  return label.trim().toLowerCase() === "birthday";
}
