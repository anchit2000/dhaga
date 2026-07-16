/**
 * Escape LIKE/ILIKE metacharacters (backslash, %, _) so free text — user
 * input or LLM-extracted names — matches literally instead of acting as a
 * wildcard pattern (Postgres' default escape character is the backslash).
 */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}
