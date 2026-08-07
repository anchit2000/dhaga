import { randomUUID } from "node:crypto";
import type { MessagingSessionItemRow } from "@/lib/db/schema";
import type { MessagingItemOutcome } from "@/utils/constants/messaging";
import { store, type RecordedOutcome } from "../harness";

/**
 * The doubles for the webhook/batch PLUMBING — sessions, items, the per-message
 * audit trail, and the confirmation inbox. The AI gateways a batch calls are
 * doubled in ./ai; what a batch writes into the graph in ./graph.
 *
 * Each is a plain in-memory implementation over `store` — enough for the
 * assertions to be about BEHAVIOUR (who was created, what was replied, what
 * verdict each message got) rather than call spying.
 */

export function itemRow(kind: string, payload: unknown): MessagingSessionItemRow {
  return {
    id: randomUUID(),
    sessionId: "session-1",
    seq: store.items.length + 1,
    kind,
    payload,
    providerMessageId: randomUUID(),
    createdAt: new Date(),
    processedAt: null,
  } as MessagingSessionItemRow;
}

export function requestScopeMock() {
  return {
    withUserDb: <T>(_userId: string, work: () => Promise<T>): Promise<T> => work(),
    getDb: async () => {
      throw new Error("no real DB in these tests — every repo is mocked");
    },
  };
}

export function afterMock() {
  return { after: (work: () => unknown) => store.deferred.push(work) };
}

export function repoMessagingMock() {
  return { ...doorMocks(), ...batchMocks(), ...auditMocks() };
}

/** The batch's current status, which the DONE lookups key off. */
function status(): string {
  return store.statuses.at(-1) ?? "open";
}

function openSession() {
  return store.items.length > 0
    ? { id: "session-1", itemCount: store.items.length, lastItemAt: new Date() }
    : null;
}

/** Everything the door (webhook → batch) touches. */
function doorMocks() {
  return {
    resolveUserIdByIdentity: async () => store.userId,
    consumeLinkToken: async (token: string) =>
      token === store.linkToken ? { userId: "user-1" } : null,
    linkIdentity: async () => undefined,
    getOpenSession: async () => (status() === "open" ? openSession() : null),
    // A batch DONE should re-drive: the open one, or the last FAILED one. Modelled
    // separately from getOpenSession because that distinction is the difference
    // between "reply DONE to try again" being true and being a lie.
    getRetriableSession: async () =>
      status() === "open" || status() === "failed" ? openSession() : null,
    getOrCreateOpenSession: async () => ({
      id: "session-1",
      itemCount: store.items.length,
      lastItemAt: new Date(),
    }),
    appendSessionItem: async (input: { kind: string; payload: unknown }) => {
      store.items.push(itemRow(input.kind, input.payload));
      return { id: "item", duplicate: false };
    },
  };
}

function batchMocks() {
  return {
    listSessionItems: async () => store.items,
    // The batch derives UNPROCESSED items only and stamps each with its verdict,
    // so a run killed mid-flight resumes instead of re-creating what it already
    // wrote. The double models that stamp, which is what makes the retry cases
    // able to fail.
    listUnprocessedSessionItems: async () => store.items.filter((item) => !item.processedAt),
    markSessionItemProcessed: async (itemId: string) => stamp([itemId]),
    setSessionStatus: async (input: { status: string }) => {
      store.statuses.push(input.status);
    },
  };
}

/** The capture log's writes: a verdict per message, an outcome per batch. */
function auditMocks() {
  return {
    recordItemOutcome: async (input: {
      itemId: string;
      kind: MessagingItemOutcome;
      detail?: Record<string, unknown>;
    }) => record([input.itemId], input.kind, input.detail),
    recordItemOutcomes: async (input: {
      itemIds: readonly string[];
      kind: MessagingItemOutcome;
      detail?: Record<string, unknown>;
    }) => record(input.itemIds, input.kind, input.detail),
    recordSessionOutcome: async (input: { summary: string | null; error: string | null }) => {
      store.sessionOutcome = { summary: input.summary, error: input.error };
    },
  };
}

function record(
  itemIds: readonly string[],
  kind: MessagingItemOutcome,
  detail?: Record<string, unknown>,
): void {
  if (itemIds.length === 0) return;
  const seqs = store.items.filter((item) => itemIds.includes(item.id)).map((item) => item.seq);
  const outcome: RecordedOutcome = { seqs, kind, detail: detail ?? null };
  store.outcomes.push(outcome);
  // Real recordItemOutcomes stamps processedAt in the same write, so a message
  // is only ever "processed" and "explained" together.
  stamp(itemIds);
}

function stamp(itemIds: readonly string[]): void {
  for (const item of store.items) {
    if (itemIds.includes(item.id)) (item as { processedAt: Date | null }).processedAt = new Date();
  }
}
