import {
  attachExtractionJobNote,
  claimExtractionJob,
  completeExtractionJob,
  failExtractionJob,
  setExtractionJobStage,
} from "@/lib/repo/extraction-jobs";
import { getContact } from "@/lib/repo/contacts";
import { clearNoteDerivations, getNote } from "@/lib/repo/notes";
import { upsertEmbedding } from "@/lib/repo/embeddings";
import { runEnrichmentSearch } from "@/lib/ai/enrich";
import {
  extractAndApplyNote,
  type NoteExtractionOutcome,
} from "@/lib/ai/note-extraction";
import { AiBudgetError } from "@/lib/ai/metering";
import type { ExtractionJobRow } from "@/lib/db/schema";

/** Indexing is best-effort (fire-and-tolerate) — a failed embed must never
 *  fail the whole extraction job; the facts still land. */
async function indexNote(noteId: string, contactId: string, body: string): Promise<void> {
  try {
    await upsertEmbedding("note", noteId, contactId, body);
  } catch {
    // Swallowed on purpose: semantic-index lag is acceptable, lost facts aren't.
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof AiBudgetError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Extraction failed.";
}

/**
 * Drain one extraction job. Called from the worker route (a normal user-scoped
 * request, so every repo write lands with the right tenant) and safe to call
 * twice — claimExtractionJob only lets the first caller past the pending gate.
 */
export async function processExtractionJob(jobId: string, userId: string): Promise<void> {
  const job = await claimExtractionJob(jobId);
  if (!job) return; // not pending — already running/done, or lost the race
  try {
    const outcome =
      job.kind === "enrichment"
        ? await processEnrichment(job, userId)
        : await processNote(job, userId);
    if (outcome.failed) {
      await failExtractionJob(jobId, outcome.notice ?? "Extraction failed.");
    } else {
      await completeExtractionJob(jobId, {
        factCount: outcome.factCount,
        followUpCount: outcome.followUpCount,
      });
    }
  } catch (error) {
    await failExtractionJob(jobId, errorMessage(error));
  }
}

async function processNote(
  job: ExtractionJobRow,
  userId: string,
): Promise<NoteExtractionOutcome> {
  if (!job.noteId) throw new Error("This note-extraction job has no note.");
  await setExtractionJobStage(job.id, "extracting");
  const [detail, note] = await Promise.all([
    getContact(job.contactId),
    getNote(job.noteId),
  ]);
  if (!detail) throw new Error("Contact not found.");
  if (!note) throw new Error("Note not found.");
  await clearNoteDerivations(note.id); // idempotent re-run on retry
  await indexNote(note.id, job.contactId, note.body);
  return extractAndApplyNote(
    userId,
    job.contactId,
    note.id,
    detail.contact.name,
    note.body,
    "note",
  );
}

async function processEnrichment(
  job: ExtractionJobRow,
  userId: string,
): Promise<NoteExtractionOutcome> {
  // A retry that already saved its findings note skips the costly web search
  // (which would also stack a second note) and just re-extracts.
  let noteId = job.noteId;
  let contactName: string;
  let text: string;
  if (noteId) {
    const [detail, note] = await Promise.all([
      getContact(job.contactId),
      getNote(noteId),
    ]);
    if (!detail) throw new Error("Contact not found.");
    if (!note) throw new Error("Enrichment note not found.");
    contactName = detail.contact.name;
    text = note.body;
  } else {
    await setExtractionJobStage(job.id, "searching");
    const findings = await runEnrichmentSearch(userId, job.contactId);
    noteId = findings.noteId;
    contactName = findings.contactName;
    text = findings.text;
    await attachExtractionJobNote(job.id, noteId);
  }
  await setExtractionJobStage(job.id, "extracting");
  await clearNoteDerivations(noteId);
  await indexNote(noteId, job.contactId, text);
  return extractAndApplyNote(
    userId,
    job.contactId,
    noteId,
    contactName,
    text,
    "enrichment",
  );
}
