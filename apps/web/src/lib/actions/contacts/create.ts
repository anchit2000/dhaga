"use server";

import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth/guard";
import { withUserDb } from "@/lib/db/request-scope";
import { SAVE_RETRY_MESSAGE, logActionError } from "@/lib/actions/resilience";
import { scheduleCardTranscription } from "@/lib/ai/card-transcription";
import { createContactProfile } from "@/lib/repo/contacts";
import { addNote } from "@/lib/repo/notes";
import { upsertEmbedding } from "@/lib/repo/embeddings";
import { saveCardImages } from "@/lib/repo/card-images";
import { shouldStoreCardPhotos } from "@/lib/repo/settings";
import { addContactToEvent, createEvent } from "@/lib/repo/events";
import { profileFromExtracted } from "@dhaga/core";
import type { GraphTarget } from "@/lib/repo/graph-data";
import {
  field,
  parseCapturedImages,
  parseProfilePayload,
  type ContactFormState,
} from "./form";

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
  const capturedImages = parseCapturedImages(formData);
  let receiptNoteId: string | null = null;
  try {
    id = await withUserDb(userId, async () => {
      const contactId = await createContactProfile(parsed.profile, source);

      // Quick-add receipts: the pasted text becomes the contact's first note.
      // For a card scan that text is composed from the extracted fields
      // (cardReceiptText) and the real card text replaces it below.
      const sourceText = field(formData, "sourceText");
      let noteId: string | null = null;
      if (sourceText) {
        noteId = await addNote(contactId, "capture_source", sourceText);
        await upsertEmbedding("note", noteId, contactId, sourceText);
      }
      receiptNoteId = noteId;

      // Card scans carry every photo through the review form; store each as a
      // visual receipt (re-check the setting — it may have changed since scan).
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

  // The scan traded the card's verbatim text for a ~3s round trip; fetch it now
  // that the contact is saved and fold it into the receipt note. Outside the try
  // so a scheduling problem can't turn a completed save into an error, and after
  // the withUserDb scope so no tenant connection is held across the LLM call.
  if (id && receiptNoteId && capturedImages.length > 0) {
    scheduleCardTranscription(
      userId,
      id,
      receiptNoteId,
      capturedImages.map((image) => ({
        mediaType: image.imageType,
        dataBase64: image.imageBase64,
      })),
    );
  }

  // A write that resolves without throwing but yields no id would redirect to
  // "/app/people/" (broken) and silently drop the contact — surface an error
  // instead. redirect() stays OUTSIDE the try (it works by throwing NEXT_REDIRECT).
  if (!id) return { error: SAVE_RETRY_MESSAGE };
  redirect(`/app/people/${id}`);
}

export interface QuickContactResult {
  target?: GraphTarget;
  error?: string;
}

/**
 * Create a bare-bones contact inline — name plus an optional current role — and
 * hand it back as a GraphTarget, so the add-relationship dialog can connect to
 * someone who isn't in the graph yet without leaving the flow. Deliberately
 * lighter than createContactAction: it neither redirects (the caller stays in
 * the dialog) nor carries capture extras, and takes only the few fields a quick
 * add needs. Reuses createContactProfile, so a matching "mentioned" stub is
 * promoted rather than duplicated. withUserDb pins one scoped connection across
 * the write (createContactProfile fans out a getDb() per distinct company).
 */
export async function quickCreateContactAction(input: {
  name: string;
  title?: string | null;
  company?: string | null;
}): Promise<QuickContactResult> {
  const userId = await requireUserId();
  const name = input.name.trim();
  if (!name) return { error: "Name is required." };
  const title = input.title?.trim() || null;
  const company = input.company?.trim() || null;

  try {
    const id = await withUserDb(userId, () =>
      createContactProfile(
        profileFromExtracted({
          name,
          title,
          company,
          emails: [],
          phones: [],
          links: [],
          location: null,
        }),
        "manual",
      ),
    );
    // Mirror the contact sublabel the typeahead builds (title · company).
    const sublabel = [title, company].filter(Boolean).join(" · ") || null;
    return { target: { id, label: name, kind: "contact", sublabel } };
  } catch (error) {
    logActionError("quickCreateContact", error);
    return { error: SAVE_RETRY_MESSAGE };
  }
}
