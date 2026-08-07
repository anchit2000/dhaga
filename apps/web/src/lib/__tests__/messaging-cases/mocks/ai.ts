import type { BatchPlan, BatchPlanCandidate, BatchPlanItem } from "@dhaga/core";
import { store } from "../harness";

/**
 * The doubles for every model the batch reaches for. The important one is
 * `batchPlanMock`: the whole batch is planned in ONE call, so this double is
 * both where a case states the model's decision and where a case can check what
 * the model was SHOWN.
 */

/**
 * Stands in for @/lib/ai/batch-plan. Records the derived batch and the candidate
 * pool verbatim, because "did the planner see every message together, and were
 * the right existing contacts in front of it" is the question every
 * mis-attribution now reduces to.
 *
 * `BatchPlanUnavailableError` is re-declared here rather than imported: the
 * processor narrows the thrown error with `instanceof` to decide the PII-free
 * failure code, so the class the double throws must be the class the mocked
 * module exports.
 */
export function batchPlanMock() {
  class BatchPlanUnavailableError extends Error {
    constructor(
      message: string,
      readonly reason: string,
    ) {
      super(message);
      this.name = "BatchPlanUnavailableError";
    }
  }
  return {
    BatchPlanUnavailableError,
    planMessagingBatch: async (
      _userId: string,
      items: readonly BatchPlanItem[],
      candidates: readonly BatchPlanCandidate[],
    ): Promise<BatchPlan> => {
      store.planCalls.push({ items: [...items], candidates: [...candidates] });
      if (store.planError) {
        throw new BatchPlanUnavailableError("planning unavailable", store.planError);
      }
      return store.plan;
    },
  };
}

export function noteExtractionMock() {
  return {
    extractAndApplyNote: async (
      _userId: string,
      contactId: string,
      _noteId: string,
      _name: string,
      body: string,
    ) => {
      store.extractionCalls.push({ contactId, body });
      return { factCount: 0, followUpCount: 0, entityCount: 0 };
    },
  };
}

export function aiMock() {
  return {
    cardScan: { scanCardImages: async () => store.scan },
    photoNote: { transcribePhotoNote: async () => store.photoText },
    metering: {
      AiBudgetError: class AiBudgetError extends Error {},
      // Metering is charged per user-visible action; the scope is transparent
      // to everything under test here, so it just runs the body.
      withAiAction: <T>(_action: unknown, fn: () => Promise<T>): Promise<T> => fn(),
    },
    edges: {
      findRelationshipCandidates: async () => store.candidates,
      // ONE query for every name the batch might mention. Recording the names it
      // was asked for is how a case pins guessNames() to the pool the planner
      // ends up seeing — too narrow a pool is a duplicate contact.
      findBatchCandidates: async (names: readonly string[]) => {
        store.candidateQuery = [...names];
        return store.candidates;
      },
    },
    owner: { resolveOwnerUserId: async () => null },
  };
}
