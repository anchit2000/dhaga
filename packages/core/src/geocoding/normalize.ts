/**
 * The cache key for a location string. Geocoding the same place twice is a
 * usage-policy breach, not just waste (see ./constants), so every read and
 * write of the geocode cache MUST key on this — one place, one lookup, ever.
 *
 * Deliberately conservative: case, Unicode composition, and whitespace/comma
 * typing style are the only things collapsed. Anything that could change WHICH
 * place is meant (word order, punctuation inside a name, abbreviations) is
 * left alone — a wrong merge puts a contact on the wrong continent.
 *
 * Returns "" for input with no usable content; callers must treat "" as
 * "not geocodable" and skip it rather than querying the provider.
 */
export function normalizeLocationQuery(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/^[\s,]+|[\s,]+$/g, "")
    .toLowerCase();
}
