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
  // Split/trim/rejoin rather than /\s*,\s*/ and /[\s,]+$/. Those two regexes
  // backtrack polynomially on a long run of whitespace — the same defect
  // CodeQL flagged in nominatim-client's trailing-slash strip, but on input
  // that is genuinely user-controlled (contacts.location arrives from imports,
  // card scans, and manual entry), so it matters more here, not less.
  // This pass is linear and does the same job.
  return input
    .normalize("NFKC")
    .split(",")
    .map((segment) => segment.trim().split(/\s+/u).filter(Boolean).join(" "))
    .filter(Boolean)
    .join(", ")
    .toLowerCase();
}
