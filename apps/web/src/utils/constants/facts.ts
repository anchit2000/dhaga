/**
 * Client-safe mirror of `@dhaga/core`'s FACT_TYPES.
 *
 * The canonical list lives in `packages/core/src/schemas/extraction.ts` and is
 * read server-side (FactList, addFactAction). Client components deliberately do
 * NOT import `@dhaga/core` for it — that pulls the extraction/LLM module into
 * the client bundle (see AddFactForm/FactList, which thread it server→prop).
 * The manual quick-add hub renders entirely inside a client subtree with no
 * server prop to thread, so it reads this mirror instead. Keep the two lists in
 * sync if the fact vocabulary ever changes.
 */
export const FACT_TYPES = ["role", "intent", "personal", "preference"] as const;
