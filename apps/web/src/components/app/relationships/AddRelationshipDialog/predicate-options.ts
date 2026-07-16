import { RELATIONSHIP_ROLES, humanizePredicate } from "@dhaga/core";

export interface PredicateOption {
  slug: string;
  /** Phrase reading src → dst ("father of"). */
  forward: string;
  custom: boolean;
}

/**
 * Built-in predicates + the user's relationship_types, deduped by slug. A
 * custom row wins over a built-in — same precedence as relationshipRole — so
 * relabeling a predicate never forks its slug into two picker entries.
 */
export function buildPredicateOptions(
  customTypes: readonly { slug: string; forwardLabel: string }[],
): PredicateOption[] {
  const bySlug = new Map<string, PredicateOption>();
  for (const slug of Object.keys(RELATIONSHIP_ROLES)) {
    bySlug.set(slug, { slug, forward: humanizePredicate(slug), custom: false });
  }
  for (const type of customTypes) {
    bySlug.set(type.slug, { slug: type.slug, forward: type.forwardLabel, custom: true });
  }
  return [...bySlug.values()].sort((a, b) => a.forward.localeCompare(b.forward));
}

/** Substring match on the human phrase or the slug ("father of" or "father_of"). */
export function filterPredicateOptions(
  options: readonly PredicateOption[],
  query: string,
): PredicateOption[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...options];
  const slugNeedle = needle.replaceAll(" ", "_");
  return options.filter(
    (option) =>
      option.forward.toLowerCase().includes(needle) || option.slug.includes(slugNeedle),
  );
}

/** "Ajay — father of → Anchit"; flipping swaps the endpoints, never the phrase. */
export function previewSentence(
  sourceName: string,
  forward: string,
  targetName: string,
  flipped: boolean,
): string {
  const [left, right] = flipped ? [targetName, sourceName] : [sourceName, targetName];
  return `${left} — ${forward} → ${right}`;
}
