export interface HowItWorksStep {
  step: string;
  title: string;
  body: string;
}

export interface AskExample {
  query: string;
  answer: string;
  answerName: string;
  receipt: string;
}

export interface ComparisonRow {
  feature: string;
  dhaga: string;
  cardApps: string;
  personalCrms: string;
  enterprise: string;
}

export interface PricingPlan {
  tier: string;
  price: string;
  strikePrice?: string;
  per: string;
  highlight: boolean;
  badge?: string;
  features: string[];
  cta: string;
}

/** One row of the /pricing plan-comparison table. Cells use the same
 *  "✓ …" / "✗ …" prefix convention as `ComparisonRow`; keys map to
 *  `PricingPlan.tier` (Free / Annual / Pro). */
export interface PlanComparisonRow {
  feature: string;
  free: string;
  annual: string;
  pro: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FeedItem {
  /** Person shown beside the row; omit for event rows (calendar chip). */
  personId?: string;
  text: string;
  bold: string[];
  time: string;
}

export interface ProfileFact {
  text: string;
  source: string;
}

/** Background extraction job, as the person page server-renders it (the
 *  extraction stream then updates the active label live — see useExtractionStream). */
export type ExtractionJobKind =
  (typeof import("@/utils/constants/extraction-jobs").EXTRACTION_JOB_KINDS)[number];
export type ExtractionJobStatus =
  (typeof import("@/utils/constants/extraction-jobs").EXTRACTION_JOB_STATUSES)[number];

export interface ExtractionJobView {
  id: string;
  kind: ExtractionJobKind;
  status: ExtractionJobStatus;
  stage: string | null;
  error: string | null;
  factCount: number;
  followUpCount: number;
  /** Running/pending but untouched past the stall threshold — offer a retry. */
  stalled: boolean;
}

/** Worker progress stages the extraction stream reports. "searching" and
 *  "extracting" are also persisted as the job's DB stage; "writing" is
 *  stream-only, emitted with the final fact count right before the job completes. */
export type ExtractionStage = "searching" | "extracting" | "writing";

/**
 * One NDJSON line the extraction worker streams to the person page
 * (POST /api/jobs/extraction/run). `stage` drives the active-job label; the
 * terminal events end the stream — `done` additionally tells the page to
 * refetch this contact's facts, `blocked`/`error` flip the job's notice.
 */
export type ExtractionStreamEvent =
  | { type: "stage"; stage: ExtractionStage; count?: number }
  | { type: "done"; factCount: number; followUpCount: number }
  | { type: "blocked"; message: string }
  | { type: "error"; message: string; retryable: boolean }
  // Another request (a second tab) already claimed this job, so this stream has
  // no progress to drive — the client reconciles via the slow status-poll
  // fallback instead of the stream ending silently.
  | { type: "detached" };
