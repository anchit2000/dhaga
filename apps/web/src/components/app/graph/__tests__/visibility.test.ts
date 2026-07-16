import { describe, expect, it } from "vitest";
import { contactsHiddenByCollapse } from "../logic/collapse";
import { buildGraphIndexes } from "../logic/indexes";
import { computeHiddenNodes, edgeIsVisible } from "../logic/visibility";
import { edge, node, payload } from "./helpers";
import type { GraphViewState } from "../types";

const graph = payload(
  [
    node("ajay", "contact"),
    node("anchit", "contact"),
    node("acme", "company"),
    node("summit", "event"),
    node("gym", "entity", { typeId: "type-gym" }),
  ],
  [
    edge("e1", "ajay", "anchit", "explicit", "parent_of"),
    edge("e2", "anchit", "acme", "works_at", "works_at"),
    edge("e3", "ajay", "summit", "attended", "attended"),
    edge("e4", "anchit", "gym", "explicit", "member_of"),
  ],
);
const indexes = buildGraphIndexes(graph);

type VisibilityState = Pick<GraphViewState, "hiddenLayers" | "isolateRootId">;

function state(overrides: Partial<VisibilityState>): VisibilityState {
  return { hiddenLayers: new Set(), isolateRootId: null, ...overrides };
}

/** No collapsed groups — the caller-computed swallow-set is empty. */
const NO_COLLAPSE: ReadonlySet<string> = new Set();

describe("visibility composition", () => {
  it("hides a layer's nodes and (via edgeIsVisible) every edge touching them", () => {
    const hidden = computeHiddenNodes(indexes, state({ hiddenLayers: new Set(["company"]) }), NO_COLLAPSE);
    expect(hidden.has("acme")).toBe(true);
    // The works_at edge must die with its endpoint or it would point at nothing.
    expect(edgeIsVisible("anchit", "acme", hidden)).toBe(false);
    expect(edgeIsVisible("ajay", "anchit", hidden)).toBe(true);
  });

  it("entity nodes filter by their custom type id, not the generic kind", () => {
    const hidden = computeHiddenNodes(indexes, state({ hiddenLayers: new Set(["type-gym"]) }), NO_COLLAPSE);
    expect(hidden.has("gym")).toBe(true);
    expect(hidden.has("anchit")).toBe(false);
  });

  it("isolate narrows to the root + 1st degree — clicking an event answers 'who did I meet there'", () => {
    const hidden = computeHiddenNodes(indexes, state({ isolateRootId: "summit" }), NO_COLLAPSE);
    expect(hidden.has("ajay")).toBe(false); // attended
    expect(hidden.has("summit")).toBe(false);
    expect(hidden.has("anchit")).toBe(true); // not at the event
    expect(hidden.has("acme")).toBe(true);
  });

  it("isolate respects layer choices instead of resurrecting hidden neighbours", () => {
    const hidden = computeHiddenNodes(
      indexes,
      state({ isolateRootId: "anchit", hiddenLayers: new Set(["company"]) }),
      NO_COLLAPSE,
    );
    // acme is a neighbour of the root, but the user turned companies off —
    // isolate is a lens on the current view, not an override of it.
    expect(hidden.has("acme")).toBe(true);
    expect(hidden.has("ajay")).toBe(false);
  });

  it("the isolate root always shows, even when its own layer is off (deep links must land)", () => {
    const hidden = computeHiddenNodes(
      indexes,
      state({ isolateRootId: "anchit", hiddenLayers: new Set(["contact"]) }),
      NO_COLLAPSE,
    );
    expect(hidden.has("anchit")).toBe(false);
  });

  it("the caller-computed swallow-set composes in, and isolate never resurrects a swallowed member", () => {
    // lone's only tether is acme; anchit is also anchored by a friend.
    const collapseGraph = payload(
      [node("lone", "contact"), node("anchit", "contact"), node("bea", "contact"), node("acme", "company")],
      [
        edge("w1", "lone", "acme", "works_at", "works_at"),
        edge("w2", "anchit", "acme", "works_at", "works_at"),
        edge("f1", "anchit", "bea"),
      ],
    );
    const collapseIndexes = buildGraphIndexes(collapseGraph);
    // The swallow-set is computed ONCE by the caller (use-render-sync) and
    // shared with the count badges — computeHiddenNodes must honour it as-is.
    const swallowed = contactsHiddenByCollapse(collapseIndexes, new Set(["acme"]), new Set());
    const hidden = computeHiddenNodes(collapseIndexes, state({ isolateRootId: "acme" }), swallowed);
    // Isolating the collapsed group itself keeps its 1st-degree neighbours,
    // but a swallowed member stays inside the badge — no resurrection.
    expect(hidden.has("lone")).toBe(true);
    expect(hidden.has("anchit")).toBe(false);
  });
});
