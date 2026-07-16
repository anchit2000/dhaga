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
    delete: (key: IDBValidKey) =>
      new FakeRequest(() => {
        data.delete(key);
        return undefined;
      }),
  };
  const db = {
    transaction: () => ({ objectStore: () => store }),
    createObjectStore: () => store,
    close: (): void => undefined,
  };
  return { factory: { open: () => new FakeRequest(() => db) } as unknown as IDBFactory, data };
}

const USER_A = "user-a";
const USER_B = "user-b";

function entry(userId: string = USER_A): CachedGraphPayload {
  return {
    userId,
    etag: '"abc123"',
    payload: payload([node("a", "contact"), node("b", "company")], [edge("e1", "a", "b")]),
    payloadBytes: 512,
    storedAt: 1_700_000_000_000,
  };
}

describe("payload cache (IndexedDB stale-while-revalidate store)", () => {
  it("round-trips a payload with its etag for the same account", async () => {
    const { factory } = fakeFactory();
    expect(await savePayloadCache(entry(), factory)).toBe(true);
    const loaded = await loadPayloadCache(USER_A, factory);
    expect(loaded?.etag).toBe('"abc123"');
    expect(loaded?.payload.nodes).toHaveLength(2);
    expect(loaded?.payloadBytes).toBe(512);
  });

  it("never serves another account's graph — mismatch misses AND purges the row", async () => {
    // Sign out → sign in as someone else in the same browser: user B must not
    // see user A's contacts via instant-paint (live incident, 2026-07-17).
    const { factory, data } = fakeFactory();
    await savePayloadCache(entry(USER_A), factory);
    expect(await loadPayloadCache(USER_B, factory)).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 0)); // purge is fire-and-forget
    expect(data.has(GRAPH_PAYLOAD_IDB_KEY)).toBe(false);
  });

  it("treats a legacy unstamped row as another account's (miss + purge)", async () => {
    const { factory, data } = fakeFactory();
    const { userId: _dropped, ...legacy } = entry();
    data.set(GRAPH_PAYLOAD_IDB_KEY, legacy);
    expect(await loadPayloadCache(USER_A, factory)).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(data.has(GRAPH_PAYLOAD_IDB_KEY)).toBe(false);
  });

  it("misses cleanly on an empty store", async () => {
    const { factory } = fakeFactory();
    expect(await loadPayloadCache(USER_A, factory)).toBeNull();
  });

  it("treats a corrupted row as a miss, never an error", async () => {
    const { factory, data } = fakeFactory();
    data.set(GRAPH_PAYLOAD_IDB_KEY, { etag: 42, payload: "garbage" });
    expect(await loadPayloadCache(USER_A, factory)).toBeNull();
  });

  it("degrades to network behavior when IndexedDB is unavailable (private mode)", async () => {
    // The node test env has no indexedDB global — exactly the unavailable case.
    expect(await loadPayloadCache(USER_A)).toBeNull();
    expect(await savePayloadCache(entry())).toBe(false);

    const throwing = { open: (): never => { throw new Error("denied"); } } as unknown as IDBFactory;
    expect(await loadPayloadCache(USER_A, throwing)).toBeNull();
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
