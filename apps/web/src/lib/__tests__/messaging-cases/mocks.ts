import { randomUUID } from "node:crypto";
import type { ExtractedContact } from "@dhaga/core";
import type { MessagingSessionItemRow } from "@/lib/db/schema";
import type { MessagingQuestionOption } from "@/utils/constants/messaging";
import { store, type StoredQuestion } from "./harness";

/**
 * Module doubles for everything the inbound path writes through. Each is a
 * plain in-memory implementation over `store` — enough for the assertions to be
 * about BEHAVIOUR (who was created, what was replied) rather than call spying.
 * Kept apart from harness.ts so the fixture and the doubles stay separate
 * concerns (and both stay inside the 150-line rule).
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
    setSessionStatus: async () => undefined,
    getPendingQuestion: async () => store.questions.at(-1) ?? null,
    createPendingQuestion: async (input: {
      provider: string;
      externalId: string;
      subjectName: string | null;
      noteBody: string;
      options: MessagingQuestionOption[];
    }) => {
      const question: StoredQuestion = {
        id: randomUUID(),
        expiresAt: new Date(Date.now() + 3_600_000),
        ...input,
      };
      store.questions.push(question);
      return question.id;
    },
    clearPendingQuestions: async () => {
      store.questions.length = 0;
    },
  };
}

export function contactsMock() {
  const create = (name: string): string => {
    const id = randomUUID();
    store.contacts.set(id, name);
    return id;
  };
  return {
    createContact: async (input: ExtractedContact) => create(input.name),
    createContactProfile: async (input: { name: string }) => create(input.name),
  };
}

export function notesMock() {
  return {
    addNote: async (contactId: string, kind: string, body: string) => {
      store.notes.push({ contactId, kind, body });
      return randomUUID();
    },
  };
}

export function embeddingsMock() {
  return { upsertEmbedding: async () => undefined };
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
      const { contact, isNoteAboutPerson, subjectName, noteBody } = store.extraction;
      return { contact, classification: { isNoteAboutPerson, subjectName, noteBody }, via: "ai" };
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
