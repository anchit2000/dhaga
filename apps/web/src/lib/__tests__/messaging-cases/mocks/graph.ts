import { randomUUID } from "node:crypto";
import type { ConfirmationOption, ContactProfile, ExtractedContact } from "@dhaga/core";
import { store } from "../harness";

/**
 * The doubles for what a batch WRITES for the user — contacts, notes,
 * embeddings, kept photos, the privacy switch that governs them, and the
 * confirmation inbox an unattributable note is parked in. Split from
 * ./session (the webhook/batch plumbing) and ./ai (the models) per the 150-line
 * rule.
 *
 * `createContact` and `createContactProfile` are kept DISTINGUISHABLE on purpose:
 * a forwarded contact card must go through the structured profile write, so a
 * case has to be able to tell which of the two ran.
 */

export function contactsMock() {
  const create = (name: string): string => {
    const id = randomUUID();
    store.contacts.set(id, name);
    return id;
  };
  return {
    createContact: async (input: ExtractedContact) => create(input.name),
    createContactProfile: async (input: ContactProfile) => {
      store.profiles.push(input);
      return create(input.name);
    },
  };
}

export function notesMock() {
  return {
    addNote: async (contactId: string, kind: string, body: string) => {
      const id = randomUUID();
      store.notes.push({ contactId, kind, body, id });
      return id;
    },
  };
}

export function embeddingsMock() {
  return { upsertEmbedding: async () => undefined };
}

export function cardImagesMock() {
  return {
    saveCardImages: async (
      contactId: string,
      noteId: string | null,
      images: unknown[],
    ): Promise<string[]> => {
      store.cardImages.push({ contactId, noteId, count: images.length });
      return images.map(() => randomUUID());
    },
  };
}

export function settingsMock() {
  return { shouldStoreCardPhotos: async () => store.storePhotos };
}

export function confirmationsMock() {
  return {
    createNoteSubjectConfirmation: async (input: {
      noteBody: string;
      subjectName: string | null;
      question: string;
      options?: ConfirmationOption[];
      origin?: string;
    }) => {
      store.confirmations.push({
        ...input,
        options: input.options ?? [],
        origin: input.origin ?? null,
      });
      return { id: randomUUID() };
    },
  };
}
