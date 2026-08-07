import { and, ne, or, ilike } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts } from "@/lib/db/schema";
import { escapeLike } from "@/utils/escape-like";
import type { RelationshipCandidate } from "./candidates";

/** Hard ceiling on the candidate pool handed to the batch planner. Enough for a
 *  batch spanning several people, small enough that the prompt stays cheap and
 *  the model is not asked to scan a directory. */
const MAX_BATCH_CANDIDATES = 24;

/**
 * Contacts whose names resemble ANY of `names`, in ONE query.
 *
 * Deliberately not `names.map(findRelationshipCandidates)`: a per-name fan-out
 * of getDb() calls under Promise.all is the exact pattern that has exhausted the
 * max-3 tenant pool in this repo before (search round-trip collapse, PR #60).
 * One OR'd query per batch instead, however many names the batch mentions.
 *
 * Matching stays as loose as the single-name version — exact, or sharing a first
 * name — because the batch planner is the thing that decides whether a
 * resemblance is the same human. Handing it a wide pool and letting it judge is
 * the point; narrowing here would re-hide the "Priya Raman is not Priya Nair"
 * decision inside a LIKE pattern.
 */
export async function findBatchCandidates(
  names: readonly string[],
): Promise<RelationshipCandidate[]> {
  const trimmed = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  if (trimmed.length === 0) return [];
  const db = await getDb();
  const patterns = trimmed.flatMap((name) => {
    const firstWord = name.split(/\s+/)[0] ?? name;
    return [ilike(contacts.name, escapeLike(name)), ilike(contacts.name, `${escapeLike(firstWord)}%`)];
  });
  const rows = await db
    .select({ id: contacts.id, name: contacts.name, title: contacts.title })
    .from(contacts)
    // Never surface a "mentioned" stub as a candidate: they are note-scoped
    // placeholders minted from bare phrases ("his son"), and offering one as a
    // person to file against is how two unrelated people get merged.
    .where(and(ne(contacts.source, "mentioned"), or(...patterns)))
    .limit(MAX_BATCH_CANDIDATES);
  return rows;
}
