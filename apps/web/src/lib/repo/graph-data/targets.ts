import { sql, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { RELATIONSHIP_ENDPOINT_KINDS } from "@/utils/constants/graph";
import { formatDate } from "@/utils/format-date";
import type { GraphTarget } from "./types";

const TARGET_LIMIT = 8;

export type GraphTargetKind = GraphTarget["kind"];

interface TargetRow {
  kind: GraphTargetKind;
  id: string;
  label: string;
  sublabel: string | null;
  started_at: Date | string | null;
}

/** One kind's typeahead SELECT for the combined UNION. Every branch projects
 *  the same columns (kind, id, label, sublabel, started_at) and ranks prefix
 *  matches ahead of substrings; a per-branch row_number lets the outer query
 *  cap each kind at TARGET_LIMIT and the caller round-robin fairly. */
function branch(kind: GraphTargetKind, like: string, prefix: string): SQL {
  const rank = (name: SQL) =>
    sql`row_number() OVER (ORDER BY (${name} ILIKE ${prefix}) DESC, ${name} ASC) AS rn`;
  switch (kind) {
    case "contact":
      return sql`SELECT 'contact' AS kind, c.id, c.name AS label,
          nullif(concat_ws(' · ', c.title, co.name), '') AS sublabel,
          NULL::timestamptz AS started_at, ${rank(sql`c.name`)}
        FROM contacts c LEFT JOIN companies co ON c.company_id = co.id
        WHERE c.name ILIKE ${like}`;
    case "company":
      return sql`SELECT 'company' AS kind, co.id, co.name AS label, co.sector AS sublabel,
          NULL::timestamptz AS started_at, ${rank(sql`co.name`)}
        FROM companies co WHERE co.name ILIKE ${like}`;
    case "entity":
      return sql`SELECT 'entity' AS kind, e.id, e.name AS label, nt.name AS sublabel,
          NULL::timestamptz AS started_at, ${rank(sql`e.name`)}
        FROM entities e LEFT JOIN node_types nt ON e.type_id = nt.id
        WHERE e.name ILIKE ${like}`;
    case "event":
      return sql`SELECT 'event' AS kind, ev.id, ev.name AS label, NULL::text AS sublabel,
          ev.started_at AS started_at, ${rank(sql`ev.name`)}
        FROM events ev WHERE ev.name ILIKE ${like}`;
  }
}

/**
 * Typeahead over graph nodes — WarmPathPanel's target search and the
 * add-relationship picker. Every requested kind is searched in ONE round-trip
 * (a UNION ALL, each branch capped at TARGET_LIMIT with prefix matches first),
 * then the kinds are interleaved round-robin up to the total cap, so eight
 * "Acme …" contacts can't starve the Acme company row out of the list. Folding
 * the per-kind queries into a single statement matters most on a region-away
 * hosted DB, where each separate query was another full network round-trip.
 * `kinds` optionally restricts the search (default: all kinds).
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

  // Stable kind order regardless of the order the caller listed them in.
  const requested = RELATIONSHIP_ENDPOINT_KINDS.filter((kind) => kinds.includes(kind));
  const branches = requested.map((kind) => sql`(${branch(kind, like, prefix)})`);
  const unioned = sql.join(branches, sql` UNION ALL `);

  const result = (await db.execute(
    sql`SELECT kind, id, label, sublabel, started_at
        FROM (${unioned}) t
        WHERE rn <= ${TARGET_LIMIT}
        ORDER BY kind, rn`,
  )) as unknown as { rows: TargetRow[] };

  // Regroup per kind (each kind already prefix-ranked, ≤ TARGET_LIMIT).
  const byKind = new Map<GraphTargetKind, TargetRow[]>();
  for (const row of result.rows) {
    (byKind.get(row.kind) ?? byKind.set(row.kind, []).get(row.kind)!).push(row);
  }
  const toTarget = (row: TargetRow): GraphTarget => ({
    id: row.id,
    label: row.label,
    kind: row.kind,
    sublabel:
      row.kind === "event"
        ? row.started_at
          ? formatDate(new Date(row.started_at))
          : null
        : row.sublabel,
  });

  // Fair round-robin across kinds up to the cap — rank i of every kind before
  // rank i+1 of any, so each kind's best matches survive.
  const targets: GraphTarget[] = [];
  for (let rank = 0; targets.length < TARGET_LIMIT; rank++) {
    let advanced = false;
    for (let k = 0; k < requested.length && targets.length < TARGET_LIMIT; k++) {
      const row = byKind.get(requested[k])?.[rank];
      if (!row) continue;
      advanced = true;
      targets.push(toTarget(row));
    }
    if (!advanced) break;
  }
  return targets;
}
