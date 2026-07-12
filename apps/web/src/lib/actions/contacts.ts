"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth/guard";
import {
  createContact,
  forgetContact,
  mergeMentionedContact,
  promoteMentionedContact,
} from "@/lib/repo/contacts";
import { addNote } from "@/lib/repo/notes";
import { upsertEmbedding } from "@/lib/repo/embeddings";
import { saveCardImage } from "@/lib/repo/card-images";
import { shouldStoreCardPhotos } from "@/lib/repo/settings";
import { addContactToEvent, createEvent } from "@/lib/repo/events";
import { CARD_IMAGE_TYPES } from "@/utils/constants/app";
import type { ExtractedContact } from "@dhaga/core";

export interface ContactFormState {
  error?: string;
}

function field(formData: FormData, name: string): string | null {
  const value = String(formData.get(name) ?? "").trim();
  return value || null;
}

function listField(formData: FormData, name: string): string[] {
  return String(formData.get(name) ?? "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function createContactAction(
  _previous: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  await requireUserId();
  const name = field(formData, "name");
  if (!name) return { error: "Name is required." };

  const input: ExtractedContact = {
    name,
    title: field(formData, "title"),
    company: field(formData, "company"),
    location: field(formData, "location"),
    emails: listField(formData, "emails"),
    phones: listField(formData, "phones"),
    links: listField(formData, "links"),
  };
  const source = field(formData, "source") === "quick_add" ? "quick_add" : "manual";
  const id = await createContact(input, source);

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
