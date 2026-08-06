import type { ConnectionFacet, ConnectionItem } from "@/lib/repo/connections";

export interface ConnectionsPage {
  items: ConnectionItem[];
  nextCursor: string | null;
  facets: ConnectionFacet[];
}

export interface ConnectionsFilter {
  q: string;
  /** `source:value` params resolved from the facet catalog at apply time. */
  facetParams: string[];
}
