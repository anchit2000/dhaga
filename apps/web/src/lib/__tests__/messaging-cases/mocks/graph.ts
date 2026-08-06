import { randomUUID } from "node:crypto";
import type { ExtractedContact } from "@dhaga/core";
import { store } from "../harness";

/**
 * The doubles for what a batch WRITES into the graph — contacts, notes,
 * embeddings, kept photos, and the privacy switch that governs them. Split from
 * ./session (which doubles the webhook/batch plumbing) per the 150-line rule.
 */

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
