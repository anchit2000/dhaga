import { describe, expect, it } from "vitest";
import {
  GRAPH_ENTITY_FALLBACK_COLOR,
  GRAPH_NODE_COLORS,
} from "@/utils/constants/graph";
import { graphNodePalette } from "../canvas/theme";
import { edgeLabel, fadeColor, nodeColor, nodePaletteKey, panelEdgeLabel } from "../logic/style";
import { edge, node } from "./helpers";

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

describe("node fills", () => {
  // The dark palette is 1.8–2.7:1 on the light canvas, so a fill that doesn't
  // follow the theme is an unreadable node — every built-in kind must re-resolve.
  it("resolves a built-in kind against the theme it's drawn on", () => {
    const contact = node("c1", "contact");
    expect(nodeColor(contact, new Map(), graphNodePalette("dark"))).toBe(
      GRAPH_NODE_COLORS.dark.contact,
    );
    expect(nodeColor(contact, new Map(), graphNodePalette("light"))).toBe(
      GRAPH_NODE_COLORS.light.contact,
    );
    expect(nodePaletteKey(contact, new Map())).toBe("contact");
  });

  // A node type's colour is the user's saved choice — theme must never rewrite it.
  it("leaves a user's node-type colour alone on both themes, but themes the fallback", () => {
    const entity = node("e1", "entity", { typeId: "t1" });
    const typeColors = new Map([["t1", "#123456"]]);
    expect(nodeColor(entity, typeColors, graphNodePalette("light"))).toBe("#123456");
    expect(nodePaletteKey(entity, typeColors)).toBeUndefined();

    // Type deleted mid-flight: the fallback is ours, so it does follow the theme.
    expect(nodeColor(entity, new Map(), graphNodePalette("light"))).toBe(
      GRAPH_ENTITY_FALLBACK_COLOR.light,
    );
    expect(nodePaletteKey(entity, new Map())).toBe("entity");
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
