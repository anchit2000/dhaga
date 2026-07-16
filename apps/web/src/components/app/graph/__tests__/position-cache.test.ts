import { describe, expect, it } from "vitest";
import {
  graphHash,
  loadPositionCache,
  savePositionCache,
  type PositionStore,
} from "../logic/position-cache";
import { edge, node } from "./helpers";
import type { PositionMap } from "../types";

function memoryStore(): PositionStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const nodes = [node("a", "contact"), node("b", "contact"), node("c", "company")];
const edges = [edge("e1", "a", "b"), edge("e2", "a", "c", "works_at", "works_at")];

describe("position cache", () => {
  it("hashes the same graph identically regardless of payload order, so a reload skips FA2", () => {
    expect(graphHash(nodes, edges)).toBe(graphHash([...nodes].reverse(), [...edges].reverse()));
  });

  it("changes the hash when an edge appears — a stale layout must never pose as final", () => {
    expect(graphHash(nodes, edges)).not.toBe(
      graphHash(nodes, [...edges, edge("e3", "b", "c", "works_at", "works_at")]),
    );
  });

  it("round-trips an exact hit", () => {
    const store = memoryStore();
    const positions: PositionMap = new Map([
      ["a", { x: 1.239, y: -2 }],
      ["b", { x: 0, y: 3 }],
      ["c", { x: 5, y: 5 }],
    ]);
    const hash = graphHash(nodes, edges);
    expect(savePositionCache(store, hash, positions)).toBe(true);

    const hit = loadPositionCache(store, hash, ["a", "b", "c"]);
    expect(hit?.exact).toBe(true);
    expect(hit?.positions.get("a")?.x).toBeCloseTo(1.24, 2);
  });

  it("offers a stale cache as a warm start when coverage is high, but never as exact", () => {
    const store = memoryStore();
    const positions: PositionMap = new Map(
      Array.from({ length: 19 }, (_, i) => [`n${i}`, { x: i, y: i }] as const),
    );
    savePositionCache(store, "old-hash", positions);

    // 19 of 20 nodes covered (95% ≥ the 90% threshold): reuse as seed —
    // a short refine pass beats a 6s cold layout.
    const ids = [...Array.from({ length: 19 }, (_, i) => `n${i}`), "brand-new"];
    const warm = loadPositionCache(store, "new-hash", ids);
    expect(warm).not.toBeNull();
    expect(warm?.exact).toBe(false);
    expect(warm?.positions.has("brand-new")).toBe(false);
  });

  it("warm-starts a tag-free graph from a cache written when tags were in the payload", () => {
    const store = memoryStore();
    const contactIds = Array.from({ length: 18 }, (_, i) => `c${i}`);
    const cached: PositionMap = new Map([
      ...contactIds.map((id, i) => [id, { x: i, y: i }] as const),
      ["tag:ai", { x: 99, y: 99 }],
      ["tag:ml", { x: 98, y: 98 }],
    ]);
    const oldNodes = [...contactIds.map((id) => node(id, "contact")), node("tag:ai", "tag"), node("tag:ml", "tag")];
    savePositionCache(store, graphHash(oldNodes, []), cached);

    // Tag hubs are lazy-loaded now, so they never reach the layout pass: the
    // default payload hashes without them, the old cache still covers every
    // contact (warm start, never exact), and stale tag spots are dropped.
    const newNodes = contactIds.map((id) => node(id, "contact"));
    const warm = loadPositionCache(store, graphHash(newNodes, []), contactIds);
    expect(warm).not.toBeNull();
    expect(warm?.exact).toBe(false);
    expect(warm?.positions.size).toBe(contactIds.length);
    expect(warm?.positions.has("tag:ai")).toBe(false);
  });

  it("returns null when overlap is too low — a mostly-foreign cache would fight the seed", () => {
    const store = memoryStore();
    savePositionCache(store, "old-hash", new Map([["x", { x: 0, y: 0 }]]));
    expect(loadPositionCache(store, "other", ["a", "b", "c"])).toBeNull();
  });

  it("degrades gracefully when the layout is too big for localStorage", () => {
    const store = memoryStore();
    const huge: PositionMap = new Map(
      Array.from({ length: 200_000 }, (_, i) => [`node-${i}`, { x: i, y: i }] as const),
    );
    expect(savePositionCache(store, "h", huge)).toBe(false);
    expect(store.data.size).toBe(0);
  });
});
