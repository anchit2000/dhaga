export type ConnectionSource = "relationship" | "event" | "company";

export interface ConnectionReason {
  source: ConnectionSource;
  label: string;
  value: string;
}

export interface ConnectionItem {
  contactId: string;
  name: string;
  title: string | null;
  mentioned: boolean;
  reasons: ConnectionReason[];
  /** Kept for graph traversal callers and older UI consumers. */
  via: string[];
}

export interface ConnectionFilter {
  facets?: Partial<Record<ConnectionSource, string[]>>;
  query?: string;
}

export interface ConnectionFacet {
  source: ConnectionSource;
  value: string;
  label: string;
  count: number;
}

export interface ConnectionPage {
  items: ConnectionItem[];
  nextCursor: string | null;
  facets: ConnectionFacet[];
}
