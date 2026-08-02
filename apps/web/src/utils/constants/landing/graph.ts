export interface GraphScene {
  id: "graph" | "warmpath";
}

export const FEATURE_GRAPH_WARM_PATH = {
  ids: ["you", "priya", "mei", "aerolane"],
  labels: ["You", "Priya Nair", "Mei Tanaka", "Aerolane"],
  target: "Aerolane",
} as const;

export const GRAPH_SCENES: GraphScene[] = [{ id: "graph" }, { id: "warmpath" }];
