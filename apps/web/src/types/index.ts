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

/** Background extraction job, as the status endpoint reports it to the poller. */
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

export interface ExtractionStatusResponse {
  jobs: ExtractionJobView[];
}
