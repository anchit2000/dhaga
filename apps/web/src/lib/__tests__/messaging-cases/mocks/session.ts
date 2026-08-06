import { randomUUID } from "node:crypto";
import type { MessagingSessionItemRow } from "@/lib/db/schema";
import type { ConfirmationOption } from "@dhaga/core";
import { store } from "../harness";

/**
 * The doubles for the webhook/batch PLUMBING — sessions, items, pending
 * questions, and the AI gateways a batch calls. What a batch writes into the
 * graph is doubled in ./graph.
 *
 * Each is a plain in-memory implementation over `store` — enough for the
 * assertions to be about BEHAVIOUR (who was created, what was replied) rather
 * than call spying. Kept apart from harness.ts so the fixture and the doubles
 * stay separate concerns (and both stay inside the 150-line rule).
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
  return {
    resolveUserIdByIdentity: async () => store.userId,
    consumeLinkToken: async (token: string) =>
      token === store.linkToken ? { userId: "user-1" } : null,
    linkIdentity: async () => undefined,
    getOpenSession: async () =>
      store.items.length > 0
        ? { id: "session-1", itemCount: store.items.length, lastItemAt: new Date() }
        : null,
    getOrCreateOpenSession: async () => ({
      id: "session-1",
      itemCount: store.items.length,
      lastItemAt: new Date(),
    }),
    appendSessionItem: async (input: { kind: string; payload: unknown }) => {
      store.items.push(itemRow(input.kind, input.payload));
      return { id: "item", duplicate: false };
    },
    listSessionItems: async () => store.items,
    // The walk consumes UNPROCESSED items and stamps each as it finishes, so a
    // killed run resumes instead of duplicating. The double models that stamp,
    // which is what makes the resume test able to fail.
    listUnprocessedSessionItems: async () => store.items.filter((item) => !item.processedAt),
    markSessionItemProcessed: async (itemId: string) => {
      const item = store.items.find((candidate) => candidate.id === itemId);
      if (item) (item as { processedAt: Date | null }).processedAt = new Date();
    },
    setSessionStatus: async () => undefined,
  };
}

export function confirmationsMock() {
  return {
    createNoteSubjectConfirmation: async (input: {
      noteBody: string;
      subjectName: string | null;
      question: string;
      options?: ConfirmationOption[];
    }) => {
      store.confirmations.push({ ...input, options: input.options ?? [] });
      return { id: randomUUID() };
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

export function contactExtractionMock() {
  return {
    extractContactFromText: async () => {
      store.contactParseCalls += 1;
      const { contact, isNoteAboutPerson, subjectName, noteBody, isInstruction } =
        store.extractionQueue.shift() ?? store.extraction;
      return {
        contact,
        classification: { isNoteAboutPerson, subjectName, noteBody, isInstruction: isInstruction ?? false },
        via: "ai",
      };
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
    edges: { findRelationshipCandidates: async () => store.candidates },
    owner: { resolveOwnerUserId: async () => null },
  };
}
