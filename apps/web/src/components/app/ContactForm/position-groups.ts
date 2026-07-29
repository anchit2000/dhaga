import { isEducationPredicate } from "@dhaga/core";
import type { Position } from "@dhaga/core";

/**
 * The contact form keeps positions as one list (one serialized payload) but
 * edits them as two dignified groups. Education rows carry an education
 * predicate (studied_at / attended); everything else — a null relation
 * included — is Experience.
 */
export function isEducationRow(position: Position): boolean {
  return isEducationPredicate(position.relation ?? "");
}

/** Split a contact's positions into the two form groups, Experience first so
 *  the primary-position denorm still reads a real job before any schooling. */
export function splitPositionGroups(positions: Position[]): {
  experience: Position[];
  education: Position[];
} {
  return {
    experience: positions.filter((position) => !isEducationRow(position)),
    education: positions.filter(isEducationRow),
  };
}
