"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth/guard";
import { withUserDb } from "@/lib/db/request-scope";
import { SAVE_RETRY_MESSAGE, logActionError } from "@/lib/actions/resilience";
import { mutation } from "@/lib/actions/mutation";
import {
  createContactProfile,
  forgetContact,
  mergeMentionedContact,
  promoteMentionedContact,
  updateContact,
} from "@/lib/repo/contacts";
import { addNote } from "@/lib/repo/notes";
import { upsertEmbedding } from "@/lib/repo/embeddings";
import { saveCardImages } from "@/lib/repo/card-images";
import { shouldStoreCardPhotos } from "@/lib/repo/settings";
import { addContactToEvent, createEvent } from "@/lib/repo/events";
import { CARD_IMAGE_TYPES, MAX_CARD_IMAGES } from "@/utils/constants/app";
import { contactProfileSchema } from "@dhaga/core";
import type { ContactProfile } from "@dhaga/core";
import type { CaptureImage } from "@dhaga/core/src/api/capture";

export interface ContactFormState {
  error?: string;
}

function field(formData: FormData, name: string): string | null {
  const value = String(formData.get(name) ?? "").trim();
  return value || null;
}

/** The ContactForm submits its whole state as one JSON `payload` field;
 *  re-validate it here (never trust the client shape) before writing. */
function parseProfilePayload(
  formData: FormData,
): { ok: true; profile: ContactProfile } | { ok: false; error: string } {
  const raw = String(formData.get("payload") ?? "");
  if (!raw) return { ok: false, error: "Nothing to save yet." };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Could not read the form. Please try again." };
  }
  const result = contactProfileSchema.safeParse(parsed);
  if (!result.success) return { ok: false, error: "Some details were invalid." };
  if (!result.data.name.trim()) return { ok: false, error: "Name is required." };
  return { ok: true, profile: result.data };
}

/**
 * Card scans carry every photo through the review form in the single
 * `capturedImages` hidden field (JSON of a CaptureImage[]). Re-validate it
 * here — never trust the client shape — dropping anything malformed and
 * capping the count, so a tampered field can't wedge the save.
 */
function parseCapturedImages(formData: FormData): CaptureImage[] {
  const raw = String(formData.get("capturedImages") ?? "").trim();
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const images: CaptureImage[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) continue;
    const { imageBase64, imageType } = item as { imageBase64?: unknown; imageType?: unknown };
    if (typeof imageBase64 !== "string" || !imageBase64) continue;
    const type = CARD_IMAGE_TYPES.find((candidate) => candidate === imageType);
    if (!type) continue;
    images.push({ imageBase64, imageType: type });
  }
  return images.slice(0, MAX_CARD_IMAGES);
}

export async function createContactAction(
  _previous: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const userId = await requireUserId();
  const parsed = parseProfilePayload(formData);
  if (!parsed.ok) return { error: parsed.error };

  const source = field(formData, "source") === "quick_add" ? "quick_add" : "manual";
  // Wrap the writes so a transient DB/connection failure returns an inline error
  // (the form stays mounted with everything the user typed) instead of throwing
  // to the error boundary. redirect() stays OUTSIDE the try — it works by
  // throwing NEXT_REDIRECT, which the catch must not swallow. withUserDb pins a
  // single scoped connection across every write below: createContactProfile
  // fans out a getDb() per distinct company, and the note/embedding/image/event
  // writes each open their own — enough to exhaust the max-3 tenant pool and
  // time out the save (a server action gets no cache() getDb() dedupe).
  let id = "";
  try {
    id = await withUserDb(userId, async () => {
      const contactId = await createContactProfile(parsed.profile, source);

      // Quick-add receipts: the pasted text becomes the contact's first note.
      const sourceText = field(formData, "sourceText");
      let noteId: string | null = null;
      if (sourceText) {
        noteId = await addNote(contactId, "capture_source", sourceText);
        await upsertEmbedding("note", noteId, contactId, sourceText);
      }

      // Card scans carry every photo through the review form; store each as a
      // visual receipt (re-check the setting — it may have changed since scan).
      const capturedImages = parseCapturedImages(formData);
      if (capturedImages.length > 0 && (await shouldStoreCardPhotos())) {
        await saveCardImages(
          contactId,
          noteId,
          capturedImages.map((image) => ({
            mediaType: image.imageType,
            dataBase64: image.imageBase64,
          })),
        );
      }

      const newEventName = field(formData, "newEventName");
      const eventId =
        newEventName != null
          ? await createEvent(newEventName)
          : field(formData, "eventId");
      if (eventId) await addContactToEvent(eventId, contactId);
      return contactId;
    });
  } catch (error) {
    logActionError("createContact", error);
    return { error: SAVE_RETRY_MESSAGE };
  }

  redirect(`/app/people/${id}`);
}

/** Edit an existing contact from the same form (no capture extras ride along). */
export async function updateContactAction(
  _previous: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const userId = await requireUserId();
  const contactId = field(formData, "contactId");
  if (!contactId) return { error: "Missing contact." };
  const parsed = parseProfilePayload(formData);
  if (!parsed.ok) return { error: parsed.error };

  try {
    // Pin one scoped connection for the whole write. updateContact fans out a
    // getDb() per distinct company (findOrCreateCompany), and a server action
    // gets no cache() getDb() dedupe — so a contact with ≥3 distinct employers
    // opened >3 connections and exhausted the max-3 tenant pool, timing out the
    // save. withUserDb makes every getDb() below resolve to the same connection.
    await withUserDb(userId, () => updateContact(contactId, parsed.profile));
  } catch (error) {
    logActionError("updateContact", error);
    return { error: SAVE_RETRY_MESSAGE };
  }
  revalidatePath(`/app/people/${contactId}`);
  revalidatePath("/app/people");
  redirect(`/app/people/${contactId}`);
}

/** Full cascade delete — the UI confirms before submitting. */
export async function forgetContactAction(formData: FormData): Promise<void> {
  const contactId = String(formData.get("contactId") ?? "");
  if (!contactId) return;
  // Route through mutation() so the cascade delete runs inside ONE scoped
  // connection (no getDb() fan-out), and a transient failure toasts via the
  // ActionForm wrapper instead of the error boundary. redirect() stays outside.
  const result = await mutation("forgetContact", () => forgetContact(contactId));
  if (!result.ok) throw new Error(result.error);
  redirect("/app/people");
}

export async function promoteMentionedContactAction(formData: FormData): Promise<void> {
  const contactId = String(formData.get("contactId") ?? "");
  if (!contactId) return;
  const result = await mutation("promoteMentionedContact", () =>
    promoteMentionedContact(contactId),
  );
  if (!result.ok) throw new Error(result.error);
  revalidatePath(`/app/people/${contactId}`);
  revalidatePath("/app/people");
}

export async function mergeMentionedContactAction(formData: FormData): Promise<void> {
  const mentionId = String(formData.get("mentionId") ?? "");
  const targetId = String(formData.get("targetId") ?? "");
  if (!mentionId || !targetId) return;
  const result = await mutation("mergeMentionedContact", () =>
    mergeMentionedContact(mentionId, targetId),
  );
  if (!result.ok) throw new Error(result.error);
  if (!result.data) return;
  revalidatePath("/app/people");
  redirect(`/app/people/${targetId}`);
}
