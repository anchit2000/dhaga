import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts, goalMembers } from "@/lib/db/schema";
import { surfaceableContact } from "@/lib/repo/contacts/surfaceable";
import { hybridSearch } from "@/lib/repo/search";
import { GOAL_COHORT_MAX, GOAL_RECALL_POOL } from "@/utils/constants/goals";

/**
 * RETRIEVAL for the nightly match pass — who is even worth judging against the
 * objective. Deliberately NOT judgment: no LLM runs here (CLAUDE.md Rule 5).
 * The job calls this and sends only the returned pool for ranking, so the cost
 * fuse is a query, not a prompt.
 *
 * KNOWN LIMITATION — recall quality is uneven by deployment. `hybridSearch`
 * runs its semantic stage through a local ONNX embedder that is unsupported on
 * Vercel serverless (lib/ai/embedder.ts), so hosted degrades to keyword +
 * trigram. A concrete objective ("people to see on my Delhi trip", "design
 * partners for the beta") recalls well because its words appear in notes and
 * titles; an abstract one ("people who could open doors for me") recalls poorly
 * because nothing in the graph is worded that way. The cohort is therefore only
 * as good as how literally the user phrased the goal.
 *
 * SECOND CEILING: `hybridSearch` returns at most 20 hits (its own final slice),
 * so GOAL_RECALL_POOL is an upper bound this path cannot currently reach. Left
 * as-is rather than widened here — a top-up of arbitrary extra contacts would
 * be the "whole graph" pool that constant exists to avoid, and every extra
 * candidate costs the match pass prompt tokens.
 *
 * Every await is SEQUENTIAL, never Promise.all (3-connection tenant pool; see
 * lib/repo/reminders/local-today.ts).
 */

export interface GoalRecallCandidate {
  contactId: string;
  name: string;
  title: string | null;
  companyName: string | null;
}

/**
 * Up to `min(GOAL_RECALL_POOL, GOAL_COHORT_MAX − current cohort)` contacts for
 * `goalId`, best keyword/semantic match first. Excludes contacts already
 * matched to this goal (the pass is re-runnable and must not re-judge them) and
 * anything Dhaga may not nominate proactively (surfaceable.ts).
 *
 * `objective` is passed rather than read back off the goal so the caller ranks
 * against exactly the wording it retrieved with.
 */
export async function recallGoalCandidates(
  objective: string,
  goalId: string,
): Promise<GoalRecallCandidate[]> {
  const hits = await hybridSearch(objective);
  if (hits.length === 0) return [];

  const db = await getDb();
  const members = await db
    .select({ contactId: goalMembers.contactId })
    .from(goalMembers)
    .where(eq(goalMembers.goalId, goalId));
  const room = GOAL_COHORT_MAX - members.length;
  if (room <= 0) return [];

  const matched = new Set(members.map((row) => row.contactId));
  const fresh = hits.filter((hit) => !matched.has(hit.contactId));
  if (fresh.length === 0) return [];

  const allowed = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(and(inArray(contacts.id, fresh.map((hit) => hit.contactId)), surfaceableContact));
  const allowedIds = new Set(allowed.map((row) => row.id));

  return fresh
    .filter((hit) => allowedIds.has(hit.contactId))
    // hybridSearch orders by score alone, which is not a total order; the id
    // tiebreak makes the pool byte-identical across runs on the same data.
    .sort((a, b) => b.score - a.score || a.contactId.localeCompare(b.contactId))
    .slice(0, Math.min(GOAL_RECALL_POOL, room))
    .map((hit) => ({
      contactId: hit.contactId,
      name: hit.name,
      title: hit.title,
      companyName: hit.companyName,
    }));
}
