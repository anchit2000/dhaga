export interface PathNode {
  id: string;
  label: string;
  kind: "contact" | "company";
}

export interface WarmPath {
  nodes: PathNode[];
}

export interface Candidate {
  to: string;
  kind: "contact" | "company";
  label: string;
}
