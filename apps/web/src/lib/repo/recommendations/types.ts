export type NetworkIntent = "general" | "founder" | "sales" | "investor";

export interface RecommendedContact {
  contactId: string;
  name: string;
  title: string | null;
  companyName: string | null;
  reasons: string[];
  action: string;
  score: number;
}

export interface RecommendationPage {
  items: RecommendedContact[];
  nextCursor: string | null;
}

export const INTENT_TERMS: Record<NetworkIntent, RegExp> = {
  general: /$a/,
  founder: /founder|co-founder|operator|product|engineering|talent|investor|partner/i,
  sales: /chief|vp|head|director|procurement|buyer|revenue|operations|engineering/i,
  investor: /founder|co-founder|investor|partner|principal|venture|angel/i,
};
