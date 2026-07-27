import type { LLMImage } from "@dhaga/core";
import type { InboundMediaRef } from "@dhaga/core/src/messaging";
import { hasTranscription, getTranscriptionClient } from "@dhaga/core/src/transcription";
import { withUserDb } from "@/lib/db/request-scope";
import { scanCardImages } from "@/lib/ai/card-scan";
import { createContact, createContactProfile } from "@/lib/repo/contacts";
import { addNote } from "@/lib/repo/notes";
import { upsertEmbedding } from "@/lib/repo/embeddings";
import { vcardToCandidates } from "@/lib/import";
import { locationNoteBody, voiceUnconfiguredNoteBody, type MessagingItemKind } from "@/utils/constants/messaging";
import type { MessagingSessionItemRow } from "@/lib/db/schema";
import { ingestText } from "./ingest-text";
import { readContactCardPayload, readLocationPayload, readMediaPayload, readTextPayload } from "./payloads";
import { setCurrentContact, type WalkState } from "./walk-state";

/** Provider mime → the vision model's accepted set; null for anything else. */
function toLLMMediaType(mime: string): LLMImage["mediaType"] | null {
  const normalized = mime.toLowerCase();
  if (normalized === "image/jpeg" || normalized === "image/jpg") return "image/jpeg";
  if (normalized === "image/png") return "image/png";
  if (normalized === "image/webp") return "image/webp";
  return null;
}

/** vCard → one contact + its receipt note. */
async function handleContactCard(state: WalkState, vcard: string): Promise<void> {
  const first = vcardToCandidates(vcard)[0];
  if (!first) return;
  const contactId = await withUserDb(state.userId, async () => {
    const id = await createContactProfile(first.contact, "messaging");
    const note = await addNote(id, "capture_source", first.receipt);
    await upsertEmbedding("note", note, id, first.receipt);
    return id;
  });
  setCurrentContact(state, contactId, first.contact.name);
}

/** Card/badge photo → one contact via the vision model. */
async function handleImage(state: WalkState, media: InboundMediaRef): Promise<void> {
  const downloaded = await state.client.downloadMedia(media);
  const mediaType = toLLMMediaType(downloaded.mimeType);
  if (!mediaType) return; // non-image mime — nothing the scanner can read
  const image: LLMImage = { mediaType, dataBase64: Buffer.from(downloaded.data).toString("base64") };
  const scan = await scanCardImages(state.userId, [image]);
  const contact = scan.contact;
  if (!contact) return; // no readable contact on the card — skip
  const rawText = scan.rawText ?? "";
  const contactId = await withUserDb(state.userId, async () => {
    const id = await createContact(contact, "messaging");
    const note = await addNote(id, "capture_source", rawText);
    await upsertEmbedding("note", note, id, rawText);
    return id;
  });
  setCurrentContact(state, contactId, contact.name);
}

/** Voice note → transcribe (if configured) and treat as text; else degrade. */
async function handleAudio(state: WalkState, media: InboundMediaRef): Promise<void> {
  const downloaded = await state.client.downloadMedia(media);
  if (hasTranscription()) {
    const result = await getTranscriptionClient().transcribe({
      data: downloaded.data,
      mimeType: downloaded.mimeType,
    });
    await ingestText(state, result.text, "voice", "voice");
    return;
  }
  // No transcription provider: keep a placeholder note if we have a contact,
  // otherwise flag it so the summary tells the user why it was dropped.
  if (state.currentContactId != null) {
    const contactId = state.currentContactId;
    await withUserDb(state.userId, () => addNote(contactId, "voice", voiceUnconfiguredNoteBody()));
    state.noteCount += 1;
  } else {
    state.droppedVoiceNote = true;
  }
}

/** Location pin → a note on the current contact (skipped if there is none). */
async function handleLocation(
  state: WalkState,
  location: { latitude: number; longitude: number; name: string | null },
): Promise<void> {
  if (state.currentContactId == null) return;
  const contactId = state.currentContactId;
  const label = location.name ?? `${location.latitude}, ${location.longitude}`;
  await withUserDb(state.userId, () => addNote(contactId, "text", locationNoteBody(label)));
  state.noteCount += 1;
}

/**
 * Process one stored item, mutating the walk state. Unknown/unsupported kinds
 * and payloads that fail to narrow are skipped — one bad item never aborts the
 * batch.
 */
export async function processSessionItem(state: WalkState, item: MessagingSessionItemRow): Promise<void> {
  switch (item.kind as MessagingItemKind) {
    case "contact_card": {
      const payload = readContactCardPayload(item.payload);
      if (payload) await handleContactCard(state, payload.vcard);
      return;
    }
    case "image": {
      const media = readMediaPayload(item.payload);
      if (media) await handleImage(state, media);
      return;
    }
    case "audio": {
      const media = readMediaPayload(item.payload);
      if (media) await handleAudio(state, media);
      return;
    }
    case "text": {
      const text = readTextPayload(item.payload);
      if (text != null) await ingestText(state, text, "capture_source", "text");
      return;
    }
    case "location": {
      const location = readLocationPayload(item.payload);
      if (location) await handleLocation(state, location);
      return;
    }
    case "unsupported":
      return;
  }
}
