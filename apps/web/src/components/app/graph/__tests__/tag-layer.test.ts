import { describe, expect, it } from "vitest";
import { GRAPH_NODE_COLORS } from "@/utils/constants/graph";
import { nodeSizeForDegree, type GraphIndexes } from "../logic/indexes";
import { mergeTagLayer, type TagRenderGraph } from "../logic/tag-layer";
import { computeHiddenNodes } from "../logic/visibility";
import { edge, node, payload, settledGraph } from "./helpers";
import type { PositionMap, TagLayerPayload } from "../types";

const THEME = { ink: "#0d0b09", seam: "#2b241b", amber: "#e2a44c" };

/** A settled render graph: two clustered contacts, one far-away contact. */
function setup(): { indexes: GraphIndexes; graph: TagRenderGraph; positions: PositionMap } {
  return settledGraph(
    payload(
      [node("c1", "contact"), node("c2", "contact"), node("c3", "contact"), node("acme", "company")],
      [edge("w1", "c1", "acme", "works_at", "works_at")],
    ),
    {
      c1: { x: 0, y: 0 },
      c2: { x: 10, y: 4 },
      c3: { x: 100, y: 100 },
      acme: { x: 5, y: 5 },
    },
  );
}

const layer: Pick<TagLayerPayload, "hubs" | "edges"> = {
  hubs: [{ id: "tag:ai", label: "AI", slug: "ai", memberCount: 2 }],
  edges: [
    { id: "tagged:ai:c1", source: "c1", target: "tag:ai" },
    { id: "tagged:ai:c2", source: "c2", target: "tag:ai" },
    // A contact deleted between the full fetch and the tag fetch must be skipped.
    { id: "tagged:ai:ghost", source: "ghost", target: "tag:ai" },
  ],
};

describe("mergeTagLayer joins the lazy tag layer without re-layout", () => {
  it("lands each hub near its members' centroid (deterministic jitter) and never moves existing nodes", () => {
    const { indexes, graph, positions } = setup();
    mergeTagLayer(layer, indexes, graph, positions, {}, THEME);

    // Members c1(0,0) and c2(10,4) → centroid (5,2); jitter is bounded ±2.
    expect(Math.abs((graph.getNodeAttribute("tag:ai", "x") as number) - 5)).toBeLessThanOrEqual(2.01);
    expect(Math.abs((graph.getNodeAttribute("tag:ai", "y") as number) - 2)).toBeLessThanOrEqual(2.01);
    expect(graph.getNodeAttribute("tag:ai", "size")).toBe(nodeSizeForDegree(2));
    expect(graph.getNodeAttribute("tag:ai", "color")).toBe(GRAPH_NODE_COLORS.tag);
    // No re-layout: the contacts stay exactly where the worker settled them.
    expect(graph.getNodeAttributes("c1")).toMatchObject({ x: 0, y: 0 });
    expect(graph.getNodeAttributes("c2")).toMatchObject({ x: 10, y: 4 });

    // Same input → same spot, so the layout stays comparable across visits.
    const rerun = setup();
    mergeTagLayer(layer, rerun.indexes, rerun.graph, rerun.positions, {}, THEME);
    expect(rerun.graph.getNodeAttribute("tag:ai", "x")).toBe(graph.getNodeAttribute("tag:ai", "x"));
  });

  it("extends the indexes in place so visibility, hover and the panel see the late nodes", () => {
    const { indexes, graph, positions } = setup();
    const merged = mergeTagLayer(layer, indexes, graph, positions, {}, THEME);

    expect(merged.nodes).toEqual([
      { id: "tag:ai", kind: "tag", label: "AI", sublabel: null, memberCount: 2 },
    ]);
    expect(merged.edges.map((tagEdge) => tagEdge.id)).toEqual(["tagged:ai:c1", "tagged:ai:c2"]);
    expect(graph.hasEdge("tagged:ai:ghost")).toBe(false); // dangling member skipped
    expect(indexes.nodeById.get("tag:ai")?.kind).toBe("tag");
    expect(indexes.neighbors.get("c1")?.has("tag:ai")).toBe(true);
    expect(indexes.degree.get("tag:ai")).toBe(2);
    expect(indexes.edgesByNode.get("c2")?.some((e) => e.kind === "tagged")).toBe(true);

    // Late nodes obey the normal layer mechanism: hiding "tag" hides the hub,
    // which is exactly how a disabled Tags layer works (hide, never remove).
    const hidden = computeHiddenNodes(
      indexes,
      { hiddenLayers: new Set(["tag"]), isolateRootId: null },
      new Set(),
    );
    expect(hidden.has("tag:ai")).toBe(true);
    expect(hidden.has("c1")).toBe(false);
  });

  it("is idempotent — a StrictMode re-run merges nothing twice", () => {
    const { indexes, graph, positions } = setup();
    mergeTagLayer(layer, indexes, graph, positions, {}, THEME);
    const orderBefore = graph.order;
    const sizeBefore = graph.size;

    const second = mergeTagLayer(layer, indexes, graph, positions, {}, THEME);
    expect(second.nodes).toEqual([]);
    expect(second.edges).toEqual([]);
    expect(graph.order).toBe(orderBefore);
    expect(graph.size).toBe(sizeBefore);
    expect(indexes.degree.get("tag:ai")).toBe(2); // no double-counted degree
  });
});
