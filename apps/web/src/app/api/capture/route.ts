import { requireUserIdFromRequest } from "@/lib/auth/guard";
import { extractContactFromText } from "@/lib/ai/contact-extraction";
import { extractAndApplyNote } from "@/lib/ai/note-extraction";
import { scanCardImage } from "@/lib/ai/card-scan";
import { createContact, getContact } from "@/lib/repo/contacts";
import { addNote } from "@/lib/repo/notes";
import { upsertEmbedding } from "@/lib/repo/embeddings";
import { saveCardImage } from "@/lib/repo/card-images";
import { shouldStoreCardPhotos } from "@/lib/repo/settings";
import { CARD_IMAGE_TYPES } from "@/utils/constants/app";

/**
 * One-shot capture for external surfaces (browser extension; later, mobile
 * share sheets): raw text in → extracted contact saved with the source text
 * as its receipt note. Same pipeline as web quick-add, minus the review
 * step — the extension shows the result and links to the contact for edits.
 */
export async function POST(request: Request): Promise<Response> {
  let userId: string;
  try {
    userId = await requireUserIdFromRequest(request);
  } catch {
    return Response.json({ error: "Not signed in to Dhaga." }, { status: 401 });
  }
  let raw = "";
  let sourceUrl = "";
  let contactId = "";
  let imageBase64 = "";
  let imageType = "";
  try {
    const body = (await request.json()) as {
      raw?: unknown;
      sourceUrl?: unknown;
      contactId?: unknown;
      imageBase64?: unknown;
      imageType?: unknown;
    };
    raw = String(body.raw ?? "").trim();
    sourceUrl = String(body.sourceUrl ?? "").trim();
    contactId = String(body.contactId ?? "").trim();
    imageBase64 = String(body.imageBase64 ?? "").trim();
    imageType = String(body.imageType ?? "").trim();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  // Card-photo path (mobile/API clients): vision-parse; the photo is kept
  // as a visual receipt unless the store-card-photos setting is off.
  if (imageBase64) {
    const mediaType = CARD_IMAGE_TYPES.find((type) => type === imageType);
    if (!mediaType) {
      return Response.json(
        { error: "imageType must be image/jpeg, image/png, or image/webp." },
        { status: 400 },
      );
    }
    if (imageBase64.length > 8_000_000) {
      return Response.json({ error: "Image too large (max ~6 MB)." }, { status: 400 });
    }
    const scan = await scanCardImage(userId, { mediaType, dataBase64: imageBase64 });
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
    if (photoStored) await saveCardImage(id, noteId, mediaType, imageBase64);
    return Response.json({
      id,
      name: scan.contact.name,
      via: "ai",
      photoStored,
      notice: null,
    });
  }

  if (!raw) {
    return Response.json({ error: "Nothing to capture." }, { status: 400 });
  }
  if (raw.length > 10_000) {
    return Response.json({ error: "Selection too long." }, { status: 400 });
  }

  // Attach mode ("save this article to Sarah"): the selection becomes a
  // note on an existing contact, and extraction mines it for facts.
  if (contactId) {
    const detail = await getContact(contactId);
    if (!detail) {
      return Response.json({ error: "Contact not found." }, { status: 404 });
    }
    const receiptText = sourceUrl ? `${raw}\n\nSource: ${sourceUrl}` : raw;
    const noteId = await addNote(contactId, "capture_source", receiptText);
    await upsertEmbedding("note", noteId, contactId, receiptText);
    const outcome = await extractAndApplyNote(
      userId,
      contactId,
      noteId,
      detail.contact.name,
      raw,
    );
    return Response.json({
      id: contactId,
      name: detail.contact.name,
      attached: true,
      notice: outcome.applied
        ? `${outcome.factCount} fact${outcome.factCount === 1 ? "" : "s"} extracted.`
        : (outcome.notice ?? null),
    });
  }

  const extraction = await extractContactFromText(userId, raw);
  if (!extraction.contact.name.trim()) {
    return Response.json(
      { error: "Couldn't find a person in that text — select their details and retry." },
      { status: 422 },
    );
  }
  const id = await createContact(extraction.contact, "quick_add");
  const receipt = sourceUrl ? `${raw}\n\nSource: ${sourceUrl}` : raw;
  const noteId = await addNote(id, "capture_source", receipt);
  await upsertEmbedding("note", noteId, id, receipt);

  return Response.json({
    id,
    name: extraction.contact.name,
    company: extraction.contact.company,
    via: extraction.via,
    notice: extraction.notice ?? null,
  });
}
