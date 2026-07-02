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
