import { describe, expect, it } from "vitest";
import { collapsedMemberCount, contactsHiddenByCollapse } from "../logic/collapse";
import { buildGraphIndexes } from "../logic/indexes";
import { edge, node, payload } from "./helpers";

// Fixture: alice and bob work at acme; bob is also friends with carol (no company).
const graph = payload(
  [node("alice", "contact"), node("bob", "contact"), node("carol", "contact"), node("acme", "company")],
  [
    edge("w1", "alice", "acme", "works_at", "works_at"),
    edge("w2", "bob", "acme", "works_at", "works_at"),
    edge("f1", "bob", "carol", "explicit", "friend_of"),
  ],
);
const indexes = buildGraphIndexes(graph);

describe("collapse membership math", () => {
  it("swallows only members whose last visible tether is the collapsed group", () => {
    const hidden = contactsHiddenByCollapse(indexes, new Set(["acme"]), new Set());
    // alice has no life outside acme — she folds into the group node.
    expect(hidden.has("alice")).toBe(true);
    // bob knows carol socially: collapsing his employer must NOT erase him,
    // or the social thread to carol would silently vanish from the canvas.
    expect(hidden.has("bob")).toBe(false);
  });

  it("treats layer-hidden neighbours as gone, so they can't anchor a member", () => {
    // carol's layer is off → bob's only other tether is invisible → bob folds too.
    const hidden = contactsHiddenByCollapse(indexes, new Set(["acme"]), new Set(["contact"]));
    expect(hidden.has("bob")).toBe(true);
  });

  it("badges the group with the count it actually swallowed, not total membership", () => {
    const hidden = contactsHiddenByCollapse(indexes, new Set(["acme"]), new Set());
    expect(collapsedMemberCount("acme", indexes, hidden)).toBe(1); // alice only
  });
});
