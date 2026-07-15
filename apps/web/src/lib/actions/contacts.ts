"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth/guard";
import {
  createContactProfile,
  forgetContact,
  mergeMentionedContact,
  promoteMentionedContact,
  updateContact,
} from "@/lib/repo/contacts";
import { addNote } from "@/lib/repo/notes";
import { upsertEmbedding } from "@/lib/repo/embeddings";
import { saveCardImage } from "@/lib/repo/card-images";
import { shouldStoreCardPhotos } from "@/lib/repo/settings";
import { addContactToEvent, createEvent } from "@/lib/repo/events";
import { CARD_IMAGE_TYPES } from "@/utils/constants/app";
import { contactProfileSchema } from "@dhaga/core";
import type { ContactProfile } from "@dhaga/core";

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

export async function createContactAction(
  _previous: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  await requireUserId();
  const parsed = parseProfilePayload(formData);
  if (!parsed.ok) return { error: parsed.error };

  const source = field(formData, "source") === "quick_add" ? "quick_add" : "manual";
  const id = await createContactProfile(parsed.profile, source);

  // Quick-add receipts: the pasted text becomes the contact's first note.
  const sourceText = field(formData, "sourceText");
  let noteId: string | null = null;
  if (sourceText) {
    noteId = await addNote(id, "capture_source", sourceText);
    await upsertEmbedding("note", noteId, id, sourceText);
  }

  // Card scans carry the photo through the review form; store it as the
  // visual receipt (re-check the setting — it may have changed since scan).
  const imageBase64 = field(formData, "imageBase64");
  const imageType = CARD_IMAGE_TYPES.find(
    (type) => type === field(formData, "imageType"),
  );
  if (imageBase64 && imageType && (await shouldStoreCardPhotos())) {
    await saveCardImage(id, noteId, imageType, imageBase64);
  }

  const newEventName = field(formData, "newEventName");
  const eventId =
    newEventName != null
      ? await createEvent(newEventName)
      : field(formData, "eventId");
  if (eventId) await addContactToEvent(eventId, id);

  redirect(`/app/people/${id}`);
}

/** Edit an existing contact from the same form (no capture extras ride along). */
export async function updateContactAction(
  _previous: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  await requireUserId();
  const contactId = field(formData, "contactId");
  if (!contactId) return { error: "Missing contact." };
  const parsed = parseProfilePayload(formData);
  if (!parsed.ok) return { error: parsed.error };

  await updateContact(contactId, parsed.profile);
  revalidatePath(`/app/people/${contactId}`);
  revalidatePath("/app/people");
  redirect(`/app/people/${contactId}`);
}

/** Full cascade delete — the UI confirms before submitting. */
export async function forgetContactAction(formData: FormData): Promise<void> {
  await requireUserId();
  const contactId = String(formData.get("contactId") ?? "");
  if (!contactId) return;
  await forgetContact(contactId);
  redirect("/app/people");
}

export async function promoteMentionedContactAction(formData: FormData): Promise<void> {
  await requireUserId();
  const contactId = String(formData.get("contactId") ?? "");
  if (!contactId) return;
  await promoteMentionedContact(contactId);
  revalidatePath(`/app/people/${contactId}`);
  revalidatePath("/app/people");
}

export async function mergeMentionedContactAction(formData: FormData): Promise<void> {
  await requireUserId();
  const mentionId = String(formData.get("mentionId") ?? "");
  const targetId = String(formData.get("targetId") ?? "");
  if (!mentionId || !targetId) return;
  const merged = await mergeMentionedContact(mentionId, targetId);
  if (!merged) return;
  revalidatePath("/app/people");
  redirect(`/app/people/${targetId}`);
}
