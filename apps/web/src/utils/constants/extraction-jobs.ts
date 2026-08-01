/**
 * Background extraction jobs: adding a note or enriching a contact no longer
 * blocks the request on the LLM calls. The submit persists a job row and
 * returns immediately; a fire-and-forget worker route runs the LLM pipeline and
 * streams its progress; the person page shows facts/follow-ups as they land.
 */

export const EXTRACTION_JOB_KINDS = ["note_extraction", "enrichment"] as const;

/**
 * Note kinds a user may manually re-run through the note-extraction pipeline
 * (trusted "note" mode — the user's own words / captures). Excludes
 * "enrichment" (web findings must re-extract in unverified mode via an
 * enrichment job, not as trusted facts), "signal" (system-generated, not a
 * user capture), and "capture_source" (a receipt/audit record of an import —
 * see IMMUTABLE_NOTE_KINDS — reprocessing it doesn't make sense since it never
 * carries derived facts to begin with). Re-processing REPLACES the note's
 * prior derivations rather than stacking duplicates — the worker clears them
 * first (clearNoteDerivations).
 */
export const REPROCESSABLE_NOTE_KINDS = ["text", "voice", "photo"] as const;

/**
 * Note kinds that are immutable once written — no delete, no reprocess. Only
 * "capture_source": the receipt a vCard/card-scan/QR/WhatsApp import leaves
 * behind, not user content, so editing it away would erase the audit trail of
 * how the contact was captured.
 */
export const IMMUTABLE_NOTE_KINDS = ["capture_source"] as const;

/**
 * Note kinds the user actually wrote/captured themselves — used for the
 * dashboard's notes count/sparkline so it reflects real notes, not system
 * receipts ("capture_source"), web research ("enrichment"), or automated
 * signals ("signal").
 */
export const USER_AUTHORED_NOTE_KINDS = ["text", "voice", "photo"] as const;

export const EXTRACTION_JOB_STATUSES = [
  "pending", // queued, worker not started
  "running", // worker is executing (see stage)
  "done", // finished; fact/follow-up counts are final
  "error", // failed; surfaced to the user with a Retry
  "blocked", // terminal: no AI budget — a calm paid-feature notice, NOT retryable
] as const;

/** Copy shown for a "blocked" job (this month's AI credits are spent — every
 *  plan has an allowance, including free): the note is saved and only the
 *  automatic extraction was skipped. Calm, never an error. */
export const EXTRACTION_BLOCKED_LABEL =
  "You're out of AI credits this month, so facts weren't extracted. Your note is saved.";

/** Human-readable label per worker stage, shown in the status pill. */
export const EXTRACTION_STAGE_LABELS: Record<string, string> = {
  searching: "Searching the public web…",
  extracting: "Extracting facts…",
};

/** A running/pending job untouched for this long is treated as stalled and
 *  offered for retry (a crashed worker or a function that hit its timeout). */
export const EXTRACTION_STALLED_AFTER_MS = 90_000;

/** Terminal jobs older than this drop out of the person page's recent-jobs
 *  render (listRecentExtractionJobs) so a finished job shows briefly, then goes. */
export const EXTRACTION_JOB_RECENT_WINDOW_MS = 5 * 60_000;

/** How long a finished job's "done — N facts added" confirmation stays on the
 *  person page before it clears itself. Long enough to read after looking away,
 *  short enough that it never becomes a permanent banner. */
export const EXTRACTION_DONE_NOTICE_MS = 12_000;

/** The daily cron marks jobs stuck longer than this as errored (retryable). */
export const EXTRACTION_REAP_AFTER_MS = 15 * 60_000;
