import { describe, expect, it } from "vitest";
import { GRAPH_COLLAPSED_GROUP_SCALE } from "@/utils/constants/graph";
import {
  emptyRenderState,
  makeEdgeReducer,
  makeNodeReducer,
  type EdgeRenderAttributes,
  type NodeRenderAttributes,
  type RenderState,
} from "../canvas/reducers";

// Sigma@3 does NOT merge a reducer's return value into the node/edge
// attributes — it replaces them wholesale, then applyNodeDefaults throws
// "could not find a valid position (x, y)" if x/y went missing. So the
// contract every reducer path must honour: every key of the input attrs
// appears in the output (values may be deliberately overridden).
function expectTotal(input: Record<string, unknown>, output: Record<string, unknown>): void {
  for (const key of Object.keys(input)) {
    expect(output, `reducer dropped "${key}" — sigma replaces attrs wholesale`).toHaveProperty(key);
  }
}

function nodeAttrs(): NodeRenderAttributes {
  return { x: 12, y: -7, label: "Anchit", size: 6, color: "#e2a44c", dimColor: "#5a4526" };
}

function edgeAttrs(): EdgeRenderAttributes {
  return {
    label: "knows",
    source: "a",
    target: "b",
    size: 1,
    color: "#3a352e",
    dimColor: "#221f1b",
    activeColor: "#e2a44c",
  };
}

function stateWith(overrides: Partial<RenderState>): { current: RenderState } {
  return { current: { ...emptyRenderState(), ...overrides } };
}

describe("node reducer keeps sigma's total-object contract", () => {
  it("default state passes positions and style through untouched", () => {
    const out = makeNodeReducer(stateWith({}))("a", nodeAttrs());
    expectTotal(nodeAttrs(), out);
    expect(out).toMatchObject({ x: 12, y: -7, size: 6, color: "#e2a44c" });
  });

  it("hidden nodes (isolated/layer filters) still carry x/y — sigma validates position before hidden", () => {
    const out = makeNodeReducer(stateWith({ hiddenNodes: new Set(["a"]) }))("a", nodeAttrs());
    expectTotal(nodeAttrs(), out);
    expect(out).toMatchObject({ x: 12, y: -7, hidden: true });
  });

  it("hover dims a non-neighbor by overriding color only — position and size survive", () => {
    const state = stateWith({ hoveredId: "h", hoveredNeighbors: new Set(["n"]) });
    const out = makeNodeReducer(state)("a", nodeAttrs());
    expectTotal(nodeAttrs(), out);
    expect(out.color).toBe(nodeAttrs().dimColor); // the deliberate override
    expect(out).toMatchObject({ x: 12, y: -7, size: 6, label: null });
  });

  it("the hovered node itself keeps everything and gains emphasis", () => {
    const out = makeNodeReducer(stateWith({ hoveredId: "a" }))("a", nodeAttrs());
    expectTotal(nodeAttrs(), out);
    expect(out).toMatchObject({ x: 12, y: -7, forceLabel: true });
  });

  it("selected node keeps positions while highlighted", () => {
    const out = makeNodeReducer(stateWith({ selectedId: "a" }))("a", nodeAttrs());
    expectTotal(nodeAttrs(), out);
    expect(out).toMatchObject({ x: 12, y: -7, highlighted: true });
  });

  it("path emphasis: on-path and off-path nodes both keep positions", () => {
    const state = stateWith({ highlightedPath: new Set(["a"]) });
    const onPath = makeNodeReducer(state)("a", nodeAttrs());
    const offPath = makeNodeReducer(state)("z", nodeAttrs());
    expectTotal(nodeAttrs(), onPath);
    expectTotal(nodeAttrs(), offPath);
    expect(onPath).toMatchObject({ x: 12, y: -7, forceLabel: true });
    expect(offPath).toMatchObject({ x: 12, y: -7, color: nodeAttrs().dimColor });
  });

  it("collapsed groups scale size deliberately without dropping position or color", () => {
    const state = stateWith({ collapsedCounts: new Map([["a", 4]]) });
    const out = makeNodeReducer(state)("a", nodeAttrs());
    expectTotal(nodeAttrs(), out);
    expect(out.size).toBe(nodeAttrs().size * GRAPH_COLLAPSED_GROUP_SCALE);
    expect(out).toMatchObject({ x: 12, y: -7, color: "#e2a44c", label: "Anchit · 4" });
  });
});

describe("edge reducer keeps sigma's total-object contract", () => {
  it("default state (labels hidden by zoom) keeps color and size", () => {
    const out = makeEdgeReducer(stateWith({}))("e", edgeAttrs());
    expectTotal(edgeAttrs(), out);
    expect(out).toMatchObject({ color: "#3a352e", size: 1, label: null });
  });

  it("zoomed-in state surfaces the label without dropping style", () => {
    const out = makeEdgeReducer(stateWith({ edgeLabelsVisible: true }))("e", edgeAttrs());
    expectTotal(edgeAttrs(), out);
    expect(out.label).toBe("knows");
  });

  it("edges to hidden nodes stay total objects while hidden", () => {
    const out = makeEdgeReducer(stateWith({ hiddenNodes: new Set(["a"]) }))("e", edgeAttrs());
    expectTotal(edgeAttrs(), out);
    expect(out.hidden).toBe(true);
  });

  it("hovered/selected/path edges override color and size deliberately, keeping the rest", () => {
    for (const overrides of [
      { hoveredId: "a" },
      { selectedId: "b" },
      { highlightedPath: new Set(["a", "b"]) },
    ] satisfies Partial<RenderState>[]) {
      const out = makeEdgeReducer(stateWith(overrides))("e", edgeAttrs());
      expectTotal(edgeAttrs(), out);
      expect(out).toMatchObject({ color: edgeAttrs().activeColor, size: 1.6, forceLabel: true });
    }
  });

  it("hover-elsewhere dims via dimColor without losing size", () => {
    const out = makeEdgeReducer(stateWith({ hoveredId: "far" }))("e", edgeAttrs());
    expectTotal(edgeAttrs(), out);
    expect(out).toMatchObject({ color: edgeAttrs().dimColor, size: 1, label: null });
  });
});
