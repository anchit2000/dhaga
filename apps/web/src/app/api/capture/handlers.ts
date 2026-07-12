import { extractContactFromText } from "@/lib/ai/contact-extraction";
import { extractAndApplyNote } from "@/lib/ai/note-extraction";
import { scanCardImage } from "@/lib/ai/card-scan";
import { createContact, getContact } from "@/lib/repo/contacts";
import { addNote } from "@/lib/repo/notes";
import { upsertEmbedding } from "@/lib/repo/embeddings";
import { saveCardImage } from "@/lib/repo/card-images";
import { shouldStoreCardPhotos } from "@/lib/repo/settings";
import { attachScanToEvent } from "@/lib/repo/event-clustering";
import { CARD_IMAGE_TYPES } from "@/utils/constants/app";
import type {
  CaptureAttachResponse,
  CaptureImageResponse,
  CaptureEventResult,
  CaptureTextResponse,
} from "@dhaga/core/src/api/capture";
import type { ParsedCaptureRequest } from "./parse-request";

/**
 * M2 auto event grouping (BRD §6.2): only attempted when the client sent
 * both a geohash and a valid timestamp — permission-denied or non-mobile
 * clients simply get no event, capture still succeeds.
 */
async function eventForScan(
  contactId: string,
  request: ParsedCaptureRequest,
): Promise<CaptureEventResult | null> {
  if (!request.geohash || !request.scannedAt) return null;
  const result = await attachScanToEvent(contactId, request.geohash, request.scannedAt);
  return { id: result.eventId, isNew: result.isNew };
}

/** Card-photo path (mobile/API clients): vision-parse; the photo is kept as
 *  a visual receipt unless the store-card-photos setting is off. */
export async function handleImageCapture(
  userId: string,
  request: ParsedCaptureRequest,
): Promise<Response> {
  const mediaType = CARD_IMAGE_TYPES.find((type) => type === request.imageType);
  if (!mediaType) {
    return Response.json(
      { error: "imageType must be image/jpeg, image/png, or image/webp." },
      { status: 400 },
    );
  }
  if (request.imageBase64.length > 8_000_000) {
    return Response.json({ error: "Image too large (max ~6 MB)." }, { status: 400 });
  }
  const scan = await scanCardImage(userId, { mediaType, dataBase64: request.imageBase64 });
  if (scan.error || !scan.contact) {
    return Response.json({ error: scan.error ?? "Scan failed." }, { status: 422 });
  }
  const id = await createContact(scan.contact, "quick_add");
  const receipt = scan.rawText ?? "";
  let noteId: string | null = null;
  if (receipt) {
    noteId = await addNote(id, "capture_source", receipt);
    await upsertEmbedding("note", noteId, id, receipt);
  }
  const photoStored = await shouldStoreCardPhotos();
  if (photoStored) await saveCardImage(id, noteId, mediaType, request.imageBase64);
  return Response.json({
    id,
    name: scan.contact.name,
    via: "ai",
    photoStored,
    notice: null,
    event: await eventForScan(id, request),
  } satisfies CaptureImageResponse);
}

/** Attach mode ("save this article to Sarah"): the selection becomes a note
 *  on an existing contact, and extraction mines it for facts. */
export async function handleAttachCapture(
  userId: string,
  request: ParsedCaptureRequest,
): Promise<Response> {
  const detail = await getContact(request.contactId);
  if (!detail) {
    return Response.json({ error: "Contact not found." }, { status: 404 });
  }
  const receiptText = request.sourceUrl
    ? `${request.raw}\n\nSource: ${request.sourceUrl}`
    : request.raw;
  const noteId = await addNote(request.contactId, "capture_source", receiptText);
  await upsertEmbedding("note", noteId, request.contactId, receiptText);
  const outcome = await extractAndApplyNote(
    userId,
    request.contactId,
    noteId,
    detail.contact.name,
    request.raw,
  );
  return Response.json({
    id: request.contactId,
    name: detail.contact.name,
    attached: true,
    notice: outcome.applied
      ? `${outcome.factCount} fact${outcome.factCount === 1 ? "" : "s"} extracted.`
      : (outcome.notice ?? null),
  } satisfies CaptureAttachResponse);
}

/** New-contact-from-text path: quick-add's paste flow and mobile's typed capture. */
export async function handleTextCapture(
  userId: string,
  request: ParsedCaptureRequest,
): Promise<Response> {
  const extraction = await extractContactFromText(userId, request.raw);
  if (!extraction.contact.name.trim()) {
    return Response.json(
      { error: "Couldn't find a person in that text — select their details and retry." },
      { status: 422 },
    );
  }
  const id = await createContact(extraction.contact, "quick_add");
  const receipt = request.sourceUrl ? `${request.raw}\n\nSource: ${request.sourceUrl}` : request.raw;
  const noteId = await addNote(id, "capture_source", receipt);
  await upsertEmbedding("note", noteId, id, receipt);

  return Response.json({
    id,
    name: extraction.contact.name,
    company: extraction.contact.company,
    via: extraction.via,
    notice: extraction.notice ?? null,
    event: await eventForScan(id, request),
  } satisfies CaptureTextResponse);
}
