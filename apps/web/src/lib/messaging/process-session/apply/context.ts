import type { RelationshipCandidate } from "@/lib/repo/edge-suggestions";
import { withUserDb } from "@/lib/db/request-scope";
import { recordItemOutcomes } from "@/lib/repo/messaging";
import type { MessagingItemOutcome } from "@/utils/constants/messaging";
import type { DerivedItem } from "../derive";

/**
 * Everything the apply step needs that is not the plan itself: who owns the
 * batch, how to get from a plan's `seq` back to the stored row it came from, and
 * the candidate names the planner was shown.
 *
 * The seq→item map is the join between the two halves of this flow. The planner
 * speaks in message positions (it never sees a database id — deliberately, so a
 * hallucinated id cannot become a write); the audit trail and the photo/vCard
 * reattachment need the actual rows.
 */
export interface ApplyContext {
  userId: string;
  bySeq: ReadonlyMap<number, DerivedItem>;
  /** Ids the planner was offered, so a returned id can be checked and NAMED.
   *  A plan referencing anything outside this map is treated as a hallucination
   *  and the person is created instead — never written against a stranger's id. */
  candidatesById: ReadonlyMap<string, RelationshipCandidate>;
}

export function buildApplyContext(
  userId: string,
  derived: readonly DerivedItem[],
  candidates: readonly RelationshipCandidate[],
): ApplyContext {
  return {
    userId,
    bySeq: new Map(derived.map((item) => [item.seq, item])),
    candidatesById: new Map(candidates.map((candidate) => [candidate.id, candidate])),
  };
}

/** What a verdict points at, so the capture log can link to the result. */
export interface OutcomeDetail {
  contactId?: string;
  contactName?: string;
  noteId?: string;
  confirmationId?: string;
  reason?: string;
}

/**
 * Stamp a verdict onto the stored rows behind a set of plan seqs. ONE update per
 * group, inside one short tenant scope — a ten-message batch must not cost ten
 * round trips against a three-connection pool.
 */
export async function markSeqs(
  context: ApplyContext,
  seqs: readonly number[],
  kind: MessagingItemOutcome,
  detail?: OutcomeDetail,
): Promise<void> {
  const itemIds = seqs
    .map((seq) => context.bySeq.get(seq)?.item.id)
    .filter((id): id is string => Boolean(id));
  if (itemIds.length === 0) return;
  await withUserDb(context.userId, () => recordItemOutcomes({ itemIds, kind, detail }));
}
