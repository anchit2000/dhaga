/**
 * Deterministic snake_case slug for user-entered names ("Father of" ->
 * "father_of", "AI/ML" -> "ai_ml"). Used for node-type slugs, relationship
 * predicate slugs derived from labels, and tag hub ids in the full graph —
 * one function so the same string always yields the same node/edge id.
 */
export function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
