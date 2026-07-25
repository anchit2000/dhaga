/**
 * Background extraction jobs: adding a note or enriching a contact no longer
 * blocks the request on the LLM calls. The submit persists a job row and
 * returns immediately; a fire-and-forget worker route runs the LLM pipeline;
 * the person page polls for status and shows facts/follow-ups as they land.
 */

export const EXTRACTION_JOB_KINDS = ["note_extraction", "enrichment"] as const;

/**
 * Note kinds a user may manually re-run through the note-extraction pipeline
 * (trusted "note" mode — the user's own words / captures). Excludes
 * "enrichment" (web findings must re-extract in unverified mode via an
 * enrichment job, not as trusted facts) and "signal" (system-generated, not a
 * user capture). Re-processing REPLACES the note's prior derivations rather
 * than stacking duplicates — the worker clears them first (clearNoteDerivations).
 */
export const REPROCESSABLE_NOTE_KINDS = ["text", "voice", "capture_source"] as const;

export const EXTRACTION_JOB_STATUSES = [
  "pending", // queued, worker not started
  "running", // worker is executing (see stage)
  "done", // finished; fact/follow-up counts are final
  "error", // failed; surfaced to the user with a Retry
  "blocked", // terminal: no AI budget — a calm paid-feature notice, NOT retryable
] as const;

/** Copy shown for a "blocked" job (free tier / monthly cap reached): the note
 *  is saved, automatic extraction is a paid feature. Calm, never an error. */
export const EXTRACTION_BLOCKED_LABEL =
  "Automatic fact extraction is a paid feature. Your note is saved.";

/** Human-readable label per worker stage, shown in the status pill. */
export const EXTRACTION_STAGE_LABELS: Record<string, string> = {
  searching: "Searching the public web…",
  extracting: "Extracting facts…",
};

/** A running/pending job untouched for this long is treated as stalled and
 *  offered for retry (a crashed worker or a function that hit its timeout). */
export const EXTRACTION_STALLED_AFTER_MS = 90_000;

/** How often the person page polls the status endpoint while work is active. */
export const EXTRACTION_POLL_INTERVAL_MS = 2_000;

/** Terminal jobs older than this drop out of the status endpoint's response so
 *  a finished job's summary shows briefly, then disappears. */
export const EXTRACTION_JOB_RECENT_WINDOW_MS = 5 * 60_000;

/** The daily cron marks jobs stuck longer than this as errored (retryable). */
export const EXTRACTION_REAP_AFTER_MS = 15 * 60_000;
