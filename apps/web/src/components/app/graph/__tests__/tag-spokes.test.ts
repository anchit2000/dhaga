import { describe, expect, it } from "vitest";
import { GRAPH_TAG_MERGE_CEILING, GRAPH_TAG_SPOKE_CAP } from "@/utils/constants/graph";
import { nodeSizeForDegree } from "../logic/indexes";
import { mergeTagLayer } from "../logic/tag-layer";
import { spokeLoadAllowed } from "../logic/tag-spokes";
import { node, payload, settledGraph } from "./helpers";
import type { TagLayerHub } from "../types";

const THEME = { ink: "#0d0b09", seam: "#2b241b", amber: "#e2a44c" };
// memberCount deliberately exceeds the spokes below — the truncated/capped case.
const HUB: TagLayerHub = { id: "tag:ai", label: "AI", slug: "ai", memberCount: 25 };
const SPOKES = [
  { id: "tagged:ai:c1", source: "c1", target: "tag:ai" },
  { id: "tagged:ai:c2", source: "c2", target: "tag:ai" },
];

function setup(): ReturnType<typeof settledGraph> {
  return settledGraph(payload([node("c1", "contact"), node("c2", "contact")], []), {
    c1: { x: 0, y: 0 },
    c2: { x: 10, y: 4 },
  });
}

/** Over-budget flow: hubs merge first without spokes, spokes per tag later. */
describe("per-tag spoke merges on a truncated tag graph", () => {
  it("sizes a spokeless hub by its aggregate memberCount, never by loaded edges", () => {
    const { indexes, graph, positions } = setup();
    const first = mergeTagLayer({ hubs: [HUB], edges: [] }, indexes, graph, positions, {}, THEME);

    expect(first.nodes[0]).toMatchObject({ id: "tag:ai", kind: "tag", memberCount: 25 });
    expect(first.edges).toEqual([]);
    // 25 members must read at true weight even with zero spokes merged —
    // the whole point of shipping the aggregate on the hub.
    expect(graph.getNodeAttribute("tag:ai", "size")).toBe(nodeSizeForDegree(25));
    expect(indexes.degree.get("tag:ai")).toBe(0);
  });

  it("re-homes the placeholder hub to its members' centroid when spokes land, idempotently", () => {
    const { indexes, graph, positions } = setup();
    mergeTagLayer({ hubs: [HUB], edges: [] }, indexes, graph, positions, {}, THEME);

    const second = mergeTagLayer({ hubs: [HUB], edges: SPOKES }, indexes, graph, positions, {}, THEME);
    expect(second.nodes).toEqual([]); // the hub itself merged once already
    expect(second.edges.map((tagEdge) => tagEdge.id)).toEqual(["tagged:ai:c1", "tagged:ai:c2"]);
    expect(indexes.degree.get("tag:ai")).toBe(2);
    // Members c1(0,0) and c2(10,4) → centroid (5,2) ± 2 jitter: the origin
    // placeholder spot (|x| ≤ 2) is abandoned so isolate reads as a cluster.
    expect(Math.abs((graph.getNodeAttribute("tag:ai", "x") as number) - 5)).toBeLessThanOrEqual(2.01);
    expect(Math.abs((graph.getNodeAttribute("tag:ai", "y") as number) - 2)).toBeLessThanOrEqual(2.01);

    // A session-cache miss or StrictMode replay must merge nothing twice.
    const third = mergeTagLayer({ hubs: [HUB], edges: SPOKES }, indexes, graph, positions, {}, THEME);
    expect(third.nodes).toEqual([]);
    expect(third.edges).toEqual([]);
    expect(indexes.degree.get("tag:ai")).toBe(2); // no double-counted degree
    expect(graph.size).toBe(2); // no duplicate edges in the renderer
  });
});

/** The client's hard stop — accumulated per-tag loads must never rebuild the
 *  pathology (measured: 873k tag edges → 3-8s reducer sweeps) budgets exist for. */
describe("spokeLoadAllowed hard-caps total merged tag edges", () => {
  it("allows a load that lands exactly at the ceiling", () => {
    expect(spokeLoadAllowed(GRAPH_TAG_MERGE_CEILING - GRAPH_TAG_SPOKE_CAP, GRAPH_TAG_SPOKE_CAP)).toBe(
      true,
    );
  });

  it("refuses a load that would cross the ceiling — fail loud, never degrade the frame rate", () => {
    expect(
      spokeLoadAllowed(GRAPH_TAG_MERGE_CEILING - GRAPH_TAG_SPOKE_CAP + 1, GRAPH_TAG_SPOKE_CAP),
    ).toBe(false);
  });

  it("counts an over-cap tag at the spoke cap — the fetch can never return more", () => {
    expect(spokeLoadAllowed(GRAPH_TAG_MERGE_CEILING - GRAPH_TAG_SPOKE_CAP, 999_999)).toBe(true);
  });
});
