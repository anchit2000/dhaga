import { RELATIONSHIP_ROLES, humanizePredicate } from "@dhaga/core";
import type { RelationshipEndpointKind } from "@/lib/repo/relationships";

export interface PredicateOption {
  slug: string;
  /** Phrase reading src → dst ("father of"). */
  forward: string;
  custom: boolean;
}

/** Built-in suggestions for edges whose non-person endpoint is this kind —
 *  person↔person pairs draw from RELATIONSHIP_ROLES instead. Suggestions
 *  only: the predicate stays free text via "Create new type…". */
const ORG_PREDICATES: Record<Exclude<RelationshipEndpointKind, "contact">, readonly string[]> = {
  company: ["works_at", "worked_at", "invests_in", "customer_of"],
  event: ["attended", "spoke_at", "organized"],
  entity: ["member_of", "attends", "works_on"],
};

/** The kind whose predicate vocabulary fits a source/target pairing: the
 *  non-person endpoint wins (a person works_at a company regardless of which
 *  side of the dialog the company sits on); person↔person means null. */
export function predicateKindFor(
  sourceKind: RelationshipEndpointKind,
  targetKind: RelationshipEndpointKind | null,
): Exclude<RelationshipEndpointKind, "contact"> | null {
  if (targetKind && targetKind !== "contact") return targetKind;
  if (sourceKind !== "contact") return sourceKind;
  return null;
}

/**
 * Built-in predicates + the user's relationship_types, deduped by slug. The
 * built-in set is kind-aware (users were hand-creating works_at/attended/
 * member_of for org targets before this). A custom row wins over a built-in —
 * same precedence as relationshipRole — so relabeling a predicate never forks
 * its slug into two picker entries.
 */
export function buildPredicateOptions(
  customTypes: readonly { slug: string; forwardLabel: string }[],
  sourceKind: RelationshipEndpointKind = "contact",
  targetKind: RelationshipEndpointKind | null = null,
): PredicateOption[] {
  const orgKind = predicateKindFor(sourceKind, targetKind);
  const builtIns = orgKind === null ? Object.keys(RELATIONSHIP_ROLES) : ORG_PREDICATES[orgKind];
  const bySlug = new Map<string, PredicateOption>();
  for (const slug of builtIns) {
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
