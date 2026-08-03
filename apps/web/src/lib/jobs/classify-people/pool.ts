import { getDb } from "@/lib/db/request-scope";
import { contacts } from "@/lib/db/schema";
import { listGraphFallbackCandidates } from "@/lib/repo/graph-fallback";
import { listQuietContacts } from "@/lib/repo/strength";
import { PERSON_CLASSIFICATION_POOL_CAP } from "@/utils/constants/person-kind";
import { dueForClassification } from "./due";

/**
 * WHICH DUE CONTACTS ARE WORTH JUDGING AT ALL.
 *
 * ./due says who the pass is ALLOWED to nominate; this says who it is worth
 * SPENDING ON. The sweep used to take every due contact, 1000 a night, until a
 * whole address book had been judged — ~5 nights and ~$2.35 for a real
 * 5,000-contact import. Most of that is work with no effect: the label only
 * ever does anything through `surfaceableContact`, and a contact the user has
 * not acted on can reach a proactive surface through exactly two terms.
 *
 * Both terms are asked DIRECTLY, in their own ordering, rather than
 * re-expressed as a predicate here — a second copy of "who is going quiet" or
 * "who is well connected" would drift, and drift is invisible in both
 * directions (judge the wrong people, or judge nobody):
 *   - `listQuietContacts` (lib/repo/strength.ts) — no touch in
 *     DECAY_AFTER_DAYS, ordered by relationship strength. Feeds the going-quiet
 *     tile (QUIET_FEED_LIMIT rows) and the suggestion engine's `quiet` term.
 *   - `listGraphFallbackCandidates` (lib/repo/graph-fallback.ts) — degree
 *     centrality > 0, ordered by degree. Feeds the suggestion engine's `degree`
 *     term, the floor that keeps Today's list full.
 *
 * THE TRADE-OFF, stated plainly: a contact that becomes a candidate later — a
 * relationship decays past the threshold, an extraction gives them their first
 * edge — is judged on the night it becomes one, not months ahead. Suppression
 * is therefore lazier, but it converges, and it is never WRONG while it waits:
 * an unjudged contact's `person_kind` is NULL, and `surfaceableContact` treats
 * NULL as not-suppressed (`IS DISTINCT FROM 'service'`), so waiting can only
 * show a row that might not deserve it — never hide one that does.
 *
 * A contact already labelled `service` is out of the pool by construction (both
 * terms filter on `surfaceableContact`), so an edited service row is no longer
 * re-judged by this pass. The user's remedy is the appeal in the UI, which is
 * the stronger one anyway: it sets `person_kind_by = 'user'` and locks the row
 * against every future run.
 *
 * Every await is SEQUENTIAL, never Promise.all (3-connection tenant pool; see
 * lib/repo/reminders/local-today.ts).
 */

export interface ClassificationPool {
  /** Contacts to judge this run, capped at PERSON_CLASSIFICATION_POOL_CAP. */
  ids: string[];
  /** Pool size BEFORE the cap, so `remaining` stays an honest drain gauge. */
  total: number;
}

export async function listClassificationPool(): Promise<ClassificationPool> {
  const db = await getDb();
  const dueRows = await db.select({ id: contacts.id }).from(contacts).where(dueForClassification);
  if (dueRows.length === 0) return { ids: [], total: 0 };
  const due = new Set(dueRows.map((row) => row.id));

  // Degree first, then quiet. Degree candidates surface in Today's suggestion
  // list, a higher-stakes surface than the going-quiet tile, and the degree list
  // is small in practice (an un-noted contact rarely has edges). Either way the
  // other term cannot starve: whatever is judged tonight leaves the due set, so
  // the next run reaches further down.
  const degree = await listGraphFallbackCandidates([], PERSON_CLASSIFICATION_POOL_CAP);
  const quiet = await listQuietContacts();

  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const id of [...degree.map((row) => row.contactId), ...quiet.map((row) => row.id)]) {
    if (!due.has(id) || seen.has(id)) continue;
    seen.add(id);
    ordered.push(id);
  }
  return { ids: ordered.slice(0, PERSON_CLASSIFICATION_POOL_CAP), total: ordered.length };
}
