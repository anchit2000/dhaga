export type ClusterDimension = "company" | "tag" | "location";

/** Sentinel keys for each dimension's catch-all cluster. */
export const UNASSIGNED_KEY = "__unassigned__";
export const OTHER_TAG_KEY = "__other__";
export const UNKNOWN_LOCATION_KEY = "__unknown__";

export interface Cluster {
  key: string;
  label: string;
  contactCount: number;
}

export interface GraphViewNode {
  id: string;
  kind: "contact" | "company";
  label: string;
  sublabel: string | null;
}

export interface GraphViewEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

export interface ClusterMembersResult {
  nodes: GraphViewNode[];
  edges: GraphViewEdge[];
  totalCount: number;
  truncated: boolean;
}

export interface GraphTarget {
  id: string;
  label: string;
  kind: "contact" | "company";
}
