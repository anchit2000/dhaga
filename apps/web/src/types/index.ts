// Domain split (File Length Rule): re-exported so `@/types` import paths hold.
export type {
  AiBudgetConfig,
  AiCapDefault,
  AiCapDefaultSource,
  AiCostSummary,
  AiCreditGrant,
  AiDollarCapConfig,
  AiDollarCeiling,
  AiDollarCeilingSource,
  AiPlanAllowances,
  AiPromotion,
  AiSpendGroup,
  AiUncreditedFeatureCost,
  AiUserCostRow,
} from "./ai-budget";

export type {
  AiCreditActivityRow,
  AiCreditAllowance,
  AiCreditBreakdownRow,
  AiCreditsOverview,
} from "./ai-usage";

export type {
  AskExample,
  ComparisonRow,
  FaqItem,
  HowItWorksStep,
  PlanComparisonRow,
  PricingPlan,
} from "./landing";

export type {
  CadenceFormSelection,
  CadenceSelectors,
  CadenceUpdateResult,
  ReachOutScheduleFields,
} from "./keep-in-touch";

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

/** One geocoded place on the map view. Contacts are grouped by their
 *  normalized `location` string, so a place is a city (the grain the data
 *  actually supports), not a street address — capture paths only ever produce
 *  free-text "City / country", and structured `addresses[]` exists solely for
 *  imported/manually-entered contacts. */
export interface MapPlace {
  /** Normalized cache key for the location string (see the geocoding normalizer). */
  key: string;
  /** Original location text as the user's data spells it, e.g. "Bengaluru". */
  label: string;
  lat: number;
  lng: number;
  contacts: MapPlaceContact[];
}

/** A contact pinned at a place. Deliberately minimal — the map payload is not
 *  a contact list, and PII beyond a display name has no business in it. */
export interface MapPlaceContact {
  id: string;
  name: string;
}

/** The whole map in one payload, mirroring the graph's full-load architecture.
 *  The two counts drive honest empty/partial states: the map must never imply
 *  it is showing everyone when most contacts simply have no location. */
export interface MapPayload {
  places: MapPlace[];
  /** Contacts whose location text was geocoded and definitively did not
   *  resolve. Waiting will not help these — distinct from `pendingCount`. */
  unresolvedCount: number;
  /** Contacts whose location has not been geocoded YET. Geocoding is deferred
   *  and rate-limited to 1 req/sec by provider ToS, so the map fills in across
   *  loads. A non-zero value is the client's signal to refetch; without it a
   *  first-ever load would look permanently empty. */
  pendingCount: number;
  /** Contacts carrying no location text at all — the common case. */
  missingCount: number;
}
