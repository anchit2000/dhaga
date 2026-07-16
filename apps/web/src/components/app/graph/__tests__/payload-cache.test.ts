import { describe, expect, it } from "vitest";
import { GRAPH_PAYLOAD_IDB_KEY } from "@/utils/constants/graph";
import {
  graphCountsChanged,
  loadPayloadCache,
  savePayloadCache,
  type CachedGraphPayload,
} from "../logic/payload-cache";
import { edge, node, payload } from "./helpers";

/** Minimal in-memory IDBFactory: the exact surface payload-cache touches
 *  (open → onsuccess, transaction → objectStore → get/put), events fired on
 *  a microtask like the real thing. */
class FakeRequest<T> {
  onsuccess: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onupgradeneeded: (() => void) | null = null;
  onblocked: (() => void) | null = null;
  result!: T;

  constructor(run: () => T) {
    queueMicrotask(() => {
      try {
        this.result = run();
        this.onsuccess?.();
      } catch {
        this.onerror?.();
      }
    });
  }
}

function fakeFactory(): { factory: IDBFactory; data: Map<IDBValidKey, unknown> } {
  const data = new Map<IDBValidKey, unknown>();
  const store = {
    get: (key: IDBValidKey) => new FakeRequest(() => data.get(key)),
    put: (value: unknown, key: IDBValidKey) =>
      new FakeRequest(() => {
        data.set(key, value);
        return key;
      }),
  };
  const db = {
    transaction: () => ({ objectStore: () => store }),
    createObjectStore: () => store,
    close: (): void => undefined,
  };
  return { factory: { open: () => new FakeRequest(() => db) } as unknown as IDBFactory, data };
}

function entry(): CachedGraphPayload {
  return {
    etag: '"abc123"',
    payload: payload([node("a", "contact"), node("b", "company")], [edge("e1", "a", "b")]),
    payloadBytes: 512,
    storedAt: 1_700_000_000_000,
  };
}

describe("payload cache (IndexedDB stale-while-revalidate store)", () => {
  it("round-trips a payload with its etag", async () => {
    const { factory } = fakeFactory();
    expect(await savePayloadCache(entry(), factory)).toBe(true);
    const loaded = await loadPayloadCache(factory);
    expect(loaded?.etag).toBe('"abc123"');
    expect(loaded?.payload.nodes).toHaveLength(2);
    expect(loaded?.payloadBytes).toBe(512);
  });

  it("misses cleanly on an empty store", async () => {
    const { factory } = fakeFactory();
    expect(await loadPayloadCache(factory)).toBeNull();
  });

  it("treats a corrupted row as a miss, never an error", async () => {
    const { factory, data } = fakeFactory();
    data.set(GRAPH_PAYLOAD_IDB_KEY, { etag: 42, payload: "garbage" });
    expect(await loadPayloadCache(factory)).toBeNull();
  });

  it("degrades to network behavior when IndexedDB is unavailable (private mode)", async () => {
    // The node test env has no indexedDB global — exactly the unavailable case.
    expect(await loadPayloadCache()).toBeNull();
    expect(await savePayloadCache(entry())).toBe(false);

    const throwing = { open: (): never => { throw new Error("denied"); } } as unknown as IDBFactory;
    expect(await loadPayloadCache(throwing)).toBeNull();
    expect(await savePayloadCache(entry(), throwing)).toBe(false);
  });
});

describe("graphCountsChanged gates the 'Graph updated' toast", () => {
  it("fires only on count changes — label edits swap in silently", () => {
    const before = payload([node("a", "contact")], []);
    expect(graphCountsChanged(before, payload([node("a", "contact"), node("b", "contact")], []))).toBe(true);
    expect(graphCountsChanged(before, payload([node("renamed", "contact")], []))).toBe(false);
  });
});
