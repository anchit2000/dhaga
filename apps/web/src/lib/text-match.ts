/**
 * Fold a name/token for equality matching: case, accents, and internal
 * whitespace runs are all noise for "is this the same name" (CSV re-import
 * dedup and name-cluster suggestions both need this -- an accented name must
 * match its unaccented spelling, and "Bob  Smith" must match "Bob Smith").
 */
export function normalizeForMatch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritical marks
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}
