import { describe, expect, it } from "vitest";
import { decideLayout } from "../logic/layout-precedence";
import type { CachedLayout } from "../logic/position-cache";
import type { GraphLayoutSnapshot, PositionMap } from "../types";

const HASH = "current-hash";

function positionsFor(ids: readonly string[], offset = 0): PositionMap {
  return new Map(ids.map((id, i) => [id, { x: i + offset, y: i + offset }]));
}

function local(ids: readonly string[], exact: boolean): CachedLayout {
  return { exact, positions: positionsFor(ids, 100) };
}

function server(hash: string, ids: readonly string[]): GraphLayoutSnapshot {
  const positions: Record<string, [number, number]> = {};
  ids.forEach((id, i) => {
    positions[id] = [i, i];
  });
  return { hash, positions };
}

const ids = Array.from({ length: 10 }, (_, i) => `n${i}`);

/**
 * The boot decision tree the whole caching design hangs on: L1 (this
 * device's localStorage) must always win, the server layout (L2) must let a
 * FRESH device skip FA2, and only when both miss does the user pay compute.
 */
describe("decideLayout precedence: L1 > L2 > compute", () => {
  it("L1 exact wins even when the server layout also matches", () => {
    const decision = decideLayout(local(ids, true), server(HASH, ids), HASH, ids);
    expect(decision).toMatchObject({ kind: "exact", source: "localStorage" });
    if (decision.kind !== "exact") throw new Error("unreachable");
    expect(decision.positions.get("n0")).toEqual({ x: 100, y: 100 }); // local coords, not server's
  });

  it("L2 exact: a matching server hash skips layout on a device with no cache", () => {
    const decision = decideLayout(null, server(HASH, ids), HASH, ids);
    expect(decision).toMatchObject({ kind: "exact", source: "db" });
    if (decision.kind !== "exact") throw new Error("unreachable");
    expect(decision.positions.size).toBe(ids.length);
  });

  it("a matching hash that does not cover every node is never trusted as exact", () => {
    const decision = decideLayout(null, server(HASH, ids.slice(0, 9)), HASH, ids);
    expect(decision.kind).toBe("warm"); // 90% coverage → warm start, not skip
  });

  it("a stale local cache warm-starts ahead of a stale server layout", () => {
    const decision = decideLayout(local(ids, false), server("older-hash", ids), HASH, ids);
    expect(decision.kind).toBe("warm");
    if (decision.kind !== "warm") throw new Error("unreachable");
    expect(decision.seed.get("n0")).toEqual({ x: 100, y: 100 });
  });

  it("a stale server layout with high overlap beats a cold start", () => {
    const decision = decideLayout(null, server("older-hash", ids.slice(0, 9)), HASH, ids);
    expect(decision.kind).toBe("warm");
    if (decision.kind !== "warm") throw new Error("unreachable");
    expect(decision.seed.has("n9")).toBe(false); // uncovered node gets seeded later
  });

  it("a mostly-foreign server layout is ignored — it would fight the seed", () => {
    expect(decideLayout(null, server("older-hash", ids.slice(0, 3)), HASH, ids).kind).toBe("cold");
  });

  it("nothing cached anywhere → compute", () => {
    expect(decideLayout(null, null, HASH, ids).kind).toBe("cold");
  });
});
