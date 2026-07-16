import { asc, ilike, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, contacts, entities, events } from "@/lib/db/schema";
import { RELATIONSHIP_ENDPOINT_KINDS } from "@/utils/constants/graph";
import type { GraphTarget } from "./types";

const TARGET_LIMIT = 8;

export type GraphTargetKind = GraphTarget["kind"];

/**
 * Typeahead over graph nodes — WarmPathPanel's target search and the
 * add-relationship picker. Each kind is queried with its own limit (prefix
 * matches ranked first) and the results are interleaved round-robin up to the
 * total cap, so eight "Acme …" contacts can't starve the Acme company row out
 * of the list. `kinds` optionally restricts the search (default: all kinds).
 */
export async function searchGraphTargets(
  query: string,
  kinds: readonly GraphTargetKind[] = RELATIONSHIP_ENDPOINT_KINDS,
): Promise<GraphTarget[]> {
  const trimmed = query.trim();
  if (!trimmed || kinds.length === 0) return [];
  const db = await getDb();
  const like = `%${trimmed}%`;
  const prefix = `${trimmed}%`;
  const queryFor = (kind: GraphTargetKind): PromiseLike<{ id: string; name: string }[]> => {
    switch (kind) {
      case "contact":
        return db.select({ id: contacts.id, name: contacts.name }).from(contacts)
          .where(ilike(contacts.name, like))
          .orderBy(sql`(${contacts.name} ILIKE ${prefix}) DESC`, asc(contacts.name))
          .limit(TARGET_LIMIT);
      case "company":
        return db.select({ id: companies.id, name: companies.name }).from(companies)
          .where(ilike(companies.name, like))
          .orderBy(sql`(${companies.name} ILIKE ${prefix}) DESC`, asc(companies.name))
          .limit(TARGET_LIMIT);
      case "entity":
        return db.select({ id: entities.id, name: entities.name }).from(entities)
          .where(ilike(entities.name, like))
          .orderBy(sql`(${entities.name} ILIKE ${prefix}) DESC`, asc(entities.name))
          .limit(TARGET_LIMIT);
      case "event":
        return db.select({ id: events.id, name: events.name }).from(events)
          .where(ilike(events.name, like))
          .orderBy(sql`(${events.name} ILIKE ${prefix}) DESC`, asc(events.name))
          .limit(TARGET_LIMIT);
    }
  };

  // Stable kind order regardless of the order the caller listed them in.
  const requested = RELATIONSHIP_ENDPOINT_KINDS.filter((kind) => kinds.includes(kind));
  const resultsByKind = await Promise.all(requested.map((kind) => queryFor(kind)));

  // Fair round-robin across kinds up to the cap — rank i of every kind before
  // rank i+1 of any, so each kind's best matches survive.
  const targets: GraphTarget[] = [];
  for (let rank = 0; targets.length < TARGET_LIMIT; rank++) {
    let advanced = false;
    for (let k = 0; k < requested.length && targets.length < TARGET_LIMIT; k++) {
      const row = resultsByKind[k][rank];
      if (!row) continue;
      advanced = true;
      targets.push({ id: row.id, label: row.name, kind: requested[k] });
    }
    if (!advanced) break;
  }
  return targets;
}
