import { describe, expect, it } from "vitest";
import { edgeLabel, fadeColor, panelEdgeLabel } from "../logic/style";
import { edge } from "./helpers";

describe("relationship labels", () => {
  it("reads an explicit edge from either seat — one stored row, both directions correct", () => {
    const parentEdge = edge("e", "ajay", "anchit", "explicit", "parent_of");
    // Viewing Ajay (source): the OTHER person is his child.
    expect(panelEdgeLabel(parentEdge, true, {})).toBe("child");
    // Viewing Anchit (target): the other person is the parent.
    expect(panelEdgeLabel(parentEdge, false, {})).toBe("parent");
  });

  it("lets user-defined relationship types override built-ins without forking the slug", () => {
    const custom = { parent_of: { forward: "father of", inverse: "child of" } };
    const parentEdge = edge("e", "ajay", "anchit", "explicit", "parent_of");
    expect(edgeLabel(parentEdge, custom)).toBe("father of");
    expect(panelEdgeLabel(parentEdge, false, custom)).toBe("father of");
  });

  it("keeps synthesized edges as plain phrases — 'works at' has no inverse role", () => {
    const worksAt = edge("w", "anchit", "acme", "works_at", "works_at");
    expect(panelEdgeLabel(worksAt, true, {})).toBe("works at");
    expect(edgeLabel(worksAt, {})).toBe("works at");
  });
});

describe("fadeColor", () => {
  it("mixes toward the background so dimmed nodes recede instead of turning grey", () => {
    expect(fadeColor("#ffffff", "#000000", 0.5)).toBe("#808080");
    expect(fadeColor("#e2a44c", "#0d0b09", 0)).toBe("#e2a44c");
  });

  it("passes malformed colours through untouched — a bad hex must not crash a frame", () => {
    expect(fadeColor("oops", "#000000", 0.5)).toBe("oops");
  });
});
