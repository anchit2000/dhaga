"use server";

import { redirect } from "next/navigation";
import { routeNoteCapture, type CaptureClassification, type ConfirmationOption } from "@dhaga/core";
import { requireUserId } from "@/lib/auth/guard";
import { withUserDb } from "@/lib/db/request-scope";
import { SAVE_RETRY_MESSAGE, logActionError } from "@/lib/actions/resilience";
import { extractAndApplyNote } from "@/lib/ai/note-extraction";
import { extractContactFromText } from "@/lib/ai/contact-extraction";
import { findContactIdentityCandidates, getContact } from "@/lib/repo/contacts";
import { createNoteSubjectConfirmation } from "@/lib/repo/confirmations";
import { findRelationshipCandidates } from "@/lib/repo/edge-suggestions";
import { addNote } from "@/lib/repo/notes";
import { upsertEmbedding } from "@/lib/repo/embeddings";
import type { QuickAddState } from "./state";

/**
 * Text capture. ONE metered contact_parse call parses contact fields AND
 * classifies whether the text is a note about a person (the foundation folded
 * both into extractContactFromText). A note routes to attach-or-confirm; contact
 * details keep the existing create/disambiguate behavior.
 */
export async function extractQuickAddAction(
  _previous: QuickAddState,
  formData: FormData,
): Promise<QuickAddState> {
  const userId = await requireUserId();
  const raw = String(formData.get("raw") ?? "").trim();
  if (!raw) return { error: "Paste some text first." };

  const extraction = await extractContactFromText(userId, raw);

  if (extraction.classification.isNoteAboutPerson) {
    // extractContactFromText never throws (offline fallback); only the note
    // path's DB work below can, so guard just that.
    try {
      return await routeCapturedNote(userId, raw, extraction.classification);
    } catch (error) {
      logActionError("extractQuickAddNote", error);
      return { error: SAVE_RETRY_MESSAGE };
    }
  }

  // Contact-details path (unchanged): a paste whose name matches more than one
  // existing contact disambiguates first; otherwise the parsed contact is
  // returned for review.
  if (formData.get("skipDisambiguation") !== "true") {
    try {
      const matches = await withUserDb(userId, () => findContactIdentityCandidates(raw));
      if (matches.length > 1) return { matches, sourceText: raw };
    } catch (error) {
      logActionError("extractQuickAdd", error);
      return { error: SAVE_RETRY_MESSAGE };
    }
  }
  return {
    contact: extraction.contact,
    via: extraction.via,
    notice: extraction.notice,
    sourceText: raw,
  };
}

/**
 * Route a captured note about a person: match the classifier's subject against
 * existing contacts, then attach silently, ask which one, or offer to create.
 * findRelationshipCandidates returns ALL candidates (exact + first-name) —
 * findContactIdentityCandidates hides a lone confident match, so it can't drive
 * the attach decision.
 */
async function routeCapturedNote(
  userId: string,
  raw: string,
  classification: CaptureClassification,
): Promise<QuickAddState> {
  const noteBody = classification.noteBody?.trim() || raw;
  const subjectName = classification.subjectName?.trim() ?? "";
  const candidates = subjectName
    ? await withUserDb(userId, () => findRelationshipCandidates(subjectName))
    : [];
  const lower = subjectName.toLocaleLowerCase();
  // "Confident" = the lone candidate's name IS the subject (exact) or the
  // subject is its full first name — never a mid-word prefix ("Sam"→"Samuel").
  const strong = candidates.filter((candidate) => {
    const name = candidate.name.toLocaleLowerCase();
    return name === lower || name.startsWith(`${lower} `);
  });
  const confidentSingleMatch = candidates.length === 1 && strong.length === 1;
  const route = routeNoteCapture({
    isNoteAboutPerson: true,
    candidateCount: candidates.length,
    confidentSingleMatch,
  });

  if (route === "attach") {
    const target = candidates[0];
    await attachNoteToContact(userId, target.id, target.name, noteBody);
    return { notice: `Added a note to ${target.name}.` };
  }

  const options: ConfirmationOption[] = candidates.map((candidate) => ({
    id: candidate.id,
    label: candidate.name,
    sublabel: candidate.title,
  }));
  const question =
    route === "confirm_create"
      ? `No contact matches "${subjectName || "this note"}". Create one and attach this note?`
      : `Which "${subjectName}" is this note about?`;
  const confirmation = await withUserDb(userId, () =>
    createNoteSubjectConfirmation({
      noteBody,
      subjectName: subjectName || null,
      question,
      options,
    }),
  );
  return { confirmation };
}

/** Attach a note to an existing contact: note + embedding write in one short
 *  scope, then fact-extraction AFTER it releases — never holding a tenant
 *  connection across the LLM call (#92). Shared by the disambiguation panel and
 *  the confident-single-match auto-attach. */
async function attachNoteToContact(
  userId: string,
  contactId: string,
  contactName: string,
  body: string,
): Promise<void> {
  const noteId = await withUserDb(userId, async () => {
    const id = await addNote(contactId, "voice", body);
    await upsertEmbedding("note", id, contactId, body);
    return id;
  });
  await extractAndApplyNote(userId, contactId, noteId, contactName, body);
}

/** Attach a captured note to the contact chosen in the disambiguation panel,
 *  then land on their page. Skips "mentioned" stubs (never a real note target). */
export async function attachCapturedNoteAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const contactId = String(formData.get("contactId") ?? "");
  const raw = String(formData.get("raw") ?? "").trim();
  if (!contactId || !raw) return;
  const detail = await withUserDb(userId, () => getContact(contactId));
  if (!detail || detail.contact.source === "mentioned") return;
  await attachNoteToContact(userId, contactId, detail.contact.name, raw);
  redirect(`/app/people/${contactId}`);
}
