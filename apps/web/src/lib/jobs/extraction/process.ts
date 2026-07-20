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
import { withUserDb } from "@/lib/db/request-scope";
import { runEnrichmentSearch } from "@/lib/ai/enrich";
import {
  extractAndApplyNote,
  type NoteExtractionOutcome,
} from "@/lib/ai/note-extraction";
import { AiBudgetError } from "@/lib/ai/metering";
import type { ExtractionJobRow } from "@/lib/db/schema";

/**
 * Connection lifecycle: every DB touch below runs inside a SHORT withUserDb
 * scope that opens a tenant-scoped connection (app.current_user_id set for
 * `userId`, so RLS holds) and releases it in the same tick. The long LLM /
 * web-search calls live inside extractAndApplyNote / runEnrichmentSearch,
 * which self-scope their own DB phases — so no Postgres backend is ever held
 * open across a ~minute-long model call. This keeps one warm Vercel instance
 * from pinning the shared Supabase session-pool budget (see @/utils/constants/db)
 * and means a 504'd/aborted request can't strand a connection across the model
 * call: there is none held at that point, and withUserDb's finally releases the
 * short DB phases without relying on Next.js `after()`.
 */

/** Indexing is best-effort (fire-and-tolerate) — a failed embed must never
 *  fail the whole extraction job; the facts still land. Its own short scope so
 *  the embedding compute never rides on another phase's connection. */
async function indexNote(
  userId: string,
  noteId: string,
  contactId: string,
  body: string,
): Promise<void> {
  try {
    await withUserDb(userId, () => upsertEmbedding("note", noteId, contactId, body));
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
  const job = await withUserDb(userId, () => claimExtractionJob(jobId));
  if (!job) return; // not pending — already running/done, or lost the race
  try {
    const outcome =
      job.kind === "enrichment"
        ? await processEnrichment(job, userId)
        : await processNote(job, userId);
    if (outcome.failed) {
      await withUserDb(userId, () =>
        failExtractionJob(jobId, outcome.notice ?? "Extraction failed."),
      );
    } else {
      await withUserDb(userId, () =>
        completeExtractionJob(jobId, {
          factCount: outcome.factCount,
          followUpCount: outcome.followUpCount,
        }),
      );
    }
  } catch (error) {
    await withUserDb(userId, () => failExtractionJob(jobId, errorMessage(error)));
  }
}

async function processNote(
  job: ExtractionJobRow,
  userId: string,
): Promise<NoteExtractionOutcome> {
  if (!job.noteId) throw new Error("This note-extraction job has no note.");
  const noteId = job.noteId;
  // Load phase (DB): stage + read contact/note + clear prior derivations.
  const { contactName, noteBody } = await withUserDb(userId, async () => {
    await setExtractionJobStage(job.id, "extracting");
    const [detail, note] = await Promise.all([getContact(job.contactId), getNote(noteId)]);
    if (!detail) throw new Error("Contact not found.");
    if (!note) throw new Error("Note not found.");
    await clearNoteDerivations(note.id); // idempotent re-run on retry
    return { contactName: detail.contact.name, noteBody: note.body };
  });
  await indexNote(userId, noteId, job.contactId, noteBody);
  // extractAndApplyNote self-scopes its DB phases around the LLM call.
  return extractAndApplyNote(userId, job.contactId, noteId, contactName, noteBody, "note");
}

async function processEnrichment(
  job: ExtractionJobRow,
  userId: string,
): Promise<NoteExtractionOutcome> {
  // A retry that already saved its findings note skips the costly web search
  // (which would also stack a second note) and just re-extracts.
  let noteId: string;
  let contactName: string;
  let text: string;
  if (job.noteId) {
    const existingNoteId = job.noteId;
    const loaded = await withUserDb(userId, async () => {
      const [detail, note] = await Promise.all([
        getContact(job.contactId),
        getNote(existingNoteId),
      ]);
      if (!detail) throw new Error("Contact not found.");
      if (!note) throw new Error("Enrichment note not found.");
      return { contactName: detail.contact.name, text: note.body };
    });
    noteId = existingNoteId;
    contactName = loaded.contactName;
    text = loaded.text;
  } else {
    await withUserDb(userId, () => setExtractionJobStage(job.id, "searching"));
    // runEnrichmentSearch self-scopes its DB phases around the web-search call.
    const findings = await runEnrichmentSearch(userId, job.contactId);
    noteId = findings.noteId;
    contactName = findings.contactName;
    text = findings.text;
    await withUserDb(userId, () => attachExtractionJobNote(job.id, findings.noteId));
  }
  await withUserDb(userId, async () => {
    await setExtractionJobStage(job.id, "extracting");
    await clearNoteDerivations(noteId);
  });
  await indexNote(userId, noteId, job.contactId, text);
  // extractAndApplyNote self-scopes its DB phases around the LLM call.
  return extractAndApplyNote(userId, job.contactId, noteId, contactName, text, "enrichment");
}
