import type { PlannedPerson } from "@dhaga/core";
import { withUserDb } from "@/lib/db/request-scope";
import { logActionError } from "@/lib/actions/resilience";
import { createContact, createContactProfile } from "@/lib/repo/contacts";
import { saveCardImages } from "@/lib/repo/card-images";
import { shouldStoreCardPhotos } from "@/lib/repo/settings";
import { UNNAMED_CONTACT_NAME } from "@/utils/constants/messaging";
import { extractNoteFacts, saveNote } from "../../note-write";
import { markSeqs, type ApplyContext } from "./context";

/** What one person in the plan actually became, for the closing report. */
export interface AppliedPerson {
  name: string;
  created: boolean;
  noteCount: number;
}

/**
 * Apply one planned person: resolve or create the contact, file their notes,
 * extract facts, and stamp every message that fed them with a verdict.
 */
export async function applyPerson(
  context: ApplyContext,
  person: PlannedPerson,
): Promise<{ person: AppliedPerson; factCount: number }> {
  const { userId } = context;
  const resolved = await resolveContact(context, person);
  const { contactId, name, created } = resolved;

  let factCount = 0;
  let noteCount = 0;
  let lastNoteId: string | null = null;
  for (const planned of person.notes) {
    const body = planned.body.trim();
    if (!body) continue;
    const noteId = await saveNote(userId, contactId, "text", body);
    lastNoteId = noteId;
    noteCount += 1;
    factCount += await extractNoteFacts({ userId, contactId, noteId, contactName: name, body });
    await markSeqs(context, planned.sourceItemSeqs, created ? "created" : "attached", {
      contactId,
      contactName: name,
      noteId,
    });
  }

  // Messages that fed this person but produced no note of their own: a shared
  // contact card, a signature block, or a directive ("create a new contact")
  // that only said what to DO. Stamped `directive` so the log shows each was
  // read and used — the old walk turned exactly this kind of message into a
  // stray "Unnamed contact" instead.
  const noteSeqs = new Set(person.notes.flatMap((note) => note.sourceItemSeqs));
  const bare = person.sourceItemSeqs.filter((seq) => !noteSeqs.has(seq));
  if (bare.length > 0) {
    await markSeqs(context, bare, created && noteCount === 0 ? "created" : "directive", {
      contactId,
      contactName: name,
    });
  }
  await keepPhotos(context, contactId, lastNoteId, [...person.sourceItemSeqs, ...noteSeqs]);
  return { person: { name, created, noteCount }, factCount };
}

/**
 * Existing contact, or a new one. A vCard's parsed PROFILE is written verbatim
 * where there is one, rather than the planner's re-reading of its text, so
 * labelled fields (work vs. mobile, org, title) survive — and only for a NEW
 * person, because a batch must never overwrite a contact the user has curated.
 */
async function resolveContact(
  context: ApplyContext,
  person: PlannedPerson,
): Promise<{ contactId: string; name: string; created: boolean }> {
  const { userId, bySeq, candidatesById } = context;
  const profile = person.sourceItemSeqs.map((seq) => bySeq.get(seq)?.profile).find(Boolean);
  const name = person.contact.name.trim() || profile?.name.trim() || UNNAMED_CONTACT_NAME;

  // Only an id the planner was actually SHOWN may be written against. Anything
  // else is a hallucination, and attaching a stranger's notes to a real contact
  // is the worst outcome this flow has — so it falls through to creation.
  const existing = person.existingContactId
    ? candidatesById.get(person.existingContactId)
    : undefined;
  if (existing) return { contactId: existing.id, name: existing.name, created: false };

  if (profile) {
    const contactId = await withUserDb(userId, () => createContactProfile(profile, "messaging"));
    return { contactId, name: profile.name.trim() || name, created: true };
  }
  // No receipt note here: the batch's own notes are written below, and the
  // messages that produced this contact are already recorded on their own rows
  // by the audit trail. The old walk wrote a `capture_source` note holding the
  // raw message text, which is what left "Create a new contact" sitting in a
  // stray contact's timeline as if it were content.
  const contactId = await withUserDb(userId, () =>
    createContact({ ...person.contact, name }, "messaging"),
  );
  return { contactId, name, created: true };
}

/**
 * Keep the photo itself, not just what was read off it — under the SAME per-user
 * privacy switch as a card scan, and hung off a note so deleting that note hard
 * deletes the photo with it. Best-effort: the notes are already written and the
 * sender already charged, so failing to keep the receipt must not throw that away.
 */
async function keepPhotos(
  context: ApplyContext,
  contactId: string,
  noteId: string | null,
  seqs: readonly number[],
): Promise<void> {
  const images = [...new Set(seqs)]
    .map((seq) => context.bySeq.get(seq)?.image)
    .filter((image): image is NonNullable<typeof image> => Boolean(image));
  if (images.length === 0) return;
  try {
    await withUserDb(context.userId, async () => {
      if (!(await shouldStoreCardPhotos())) return;
      await saveCardImages(contactId, noteId, images);
    });
  } catch (error) {
    // No PII: the failure only, never the image or what was read off it.
    logActionError("messaging_keep_photo", error);
  }
}
