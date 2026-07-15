import { describe, expect, it } from "vitest";
import { buildFlow } from "@/components/app/graph/layout";
import type { ClusterEntry, FocusRelationships } from "@/components/app/graph/graph-state";
import type { Cluster } from "@/lib/repo/graph-data";

const focus: FocusRelationships = {
  nodes: [{ id: "anchit", kind: "contact", label: "Anchit", sublabel: null }],
  edges: [{ id: "e1", source: "ajay", target: "anchit", label: "parent of" }],
};

describe("buildFlow focus-relationship overlay", () => {
  it("draws a focused contact's cross-cluster relationship even when the neighbour is in no expanded cluster", () => {
    const clusters: Cluster[] = [{ key: "companyA", label: "A", contactCount: 1 }];
    const loaded = new Map<string, ClusterEntry>([
      [
        "companyA",
        {
          contacts: [{ id: "ajay", kind: "contact", label: "Ajay", sublabel: null }],
          edges: [],
          overflowCount: 0,
        },
      ],
    ]);

    const { nodes, edges } = buildFlow(
      clusters,
      new Set(["companyA"]),
      loaded,
      new Set(),
      undefined,
      "ajay",
      focus,
    );

    // Anchit lives in no expanded cluster; the overlay must still place him so
    // the edge has both endpoints on the canvas and renders. This is the exact
    // gap that made interpersonal edges invisible in the graph.
    expect(nodes.some((node) => node.id === "anchit")).toBe(true);
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe("ajay");
    expect(edges[0].target).toBe("anchit");
  });

  it("does not duplicate a neighbour that's already on the canvas", () => {
    const clusters: Cluster[] = [{ key: "companyA", label: "A", contactCount: 2 }];
    const loaded = new Map<string, ClusterEntry>([
      [
        "companyA",
        {
          contacts: [
            { id: "ajay", kind: "contact", label: "Ajay", sublabel: null },
            { id: "anchit", kind: "contact", label: "Anchit", sublabel: null },
          ],
          edges: [],
          overflowCount: 0,
        },
      ],
    ]);

    const { nodes, edges } = buildFlow(
      clusters,
      new Set(["companyA"]),
      loaded,
      new Set(),
      undefined,
      "ajay",
      focus,
    );

    expect(nodes.filter((node) => node.id === "anchit")).toHaveLength(1);
    expect(edges).toHaveLength(1);
  });
});
