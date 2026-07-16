import {
  GRAPH_PAYLOAD_IDB_KEY,
  GRAPH_PAYLOAD_IDB_NAME,
  GRAPH_PAYLOAD_IDB_STORE,
} from "@/utils/constants/graph";
import type { FullGraphPayload } from "../types";

/** The one IndexedDB row: last payload + its HTTP validator and wire size. */
export interface CachedGraphPayload {
  /**
   * Owner of the cached graph. Contact data must never cross account
   * boundaries in a shared browser: sign out → sign in as another user and
   * an unstamped instant-paint would show the previous account's graph
   * (found live, 2026-07-17). Mismatch (including legacy unstamped rows)
   * purges the row and falls back to a network fetch.
   */
  userId: string;
  etag: string;
  payload: FullGraphPayload;
  /** Serialized size when it came off the network (perf beacon field). */
  payloadBytes: number;
  storedAt: number;
}

/** Raw-IDB plumbing (no dependency): every failure path — private mode,
 *  quota, blocked upgrade, corrupted row — resolves to null/false so the
 *  caller falls back to a plain network fetch, never an error state. */
function resolveFactory(factory?: IDBFactory): IDBFactory | null {
  if (factory) return factory;
  return typeof indexedDB === "undefined" ? null : indexedDB;
}

function openDb(factory: IDBFactory): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      request = factory.open(GRAPH_PAYLOAD_IDB_NAME, 1);
    } catch {
      resolve(null); // Firefox private mode throws synchronously
      return;
    }
    request.onupgradeneeded = () => request.result.createObjectStore(GRAPH_PAYLOAD_IDB_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
  factory?: IDBFactory,
): Promise<T | null> {
  const idb = resolveFactory(factory);
  if (!idb) return null;
  const db = await openDb(idb);
  if (!db) return null;
  try {
    return await new Promise<T | null>((resolve) => {
      let request: IDBRequest<T>;
      try {
        request = work(db.transaction(GRAPH_PAYLOAD_IDB_STORE, mode).objectStore(GRAPH_PAYLOAD_IDB_STORE));
      } catch {
        resolve(null);
        return;
      }
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => resolve(null);
    });
  } finally {
    db.close();
  }
}

/** Last cached payload for THIS user, or null (absent, corrupted, IDB
 *  unavailable, or owned by a different account — that last case also
 *  purges the row so the stale graph can never resurface). */
export async function loadPayloadCache(
  viewerId: string,
  factory?: IDBFactory,
): Promise<CachedGraphPayload | null> {
  const row = await withStore(
    "readonly",
    (store) => store.get(GRAPH_PAYLOAD_IDB_KEY) as IDBRequest<CachedGraphPayload | undefined>,
    factory,
  );
  if (!row || typeof row !== "object") return null;
  if (typeof row.etag !== "string" || !Array.isArray(row.payload?.nodes) || !Array.isArray(row.payload?.edges)) {
    return null;
  }
  if (row.userId !== viewerId) {
    void clearPayloadCache(factory);
    return null;
  }
  return row;
}

/** Drop the cached payload (account switch, sign-out cleanup). */
export async function clearPayloadCache(factory?: IDBFactory): Promise<void> {
  await withStore("readwrite", (store) => store.delete(GRAPH_PAYLOAD_IDB_KEY), factory);
}

/** Best-effort store; false when IDB is unavailable or the write fails. */
export async function savePayloadCache(
  entry: CachedGraphPayload,
  factory?: IDBFactory,
): Promise<boolean> {
  const key = await withStore(
    "readwrite",
    (store) => store.put(entry, GRAPH_PAYLOAD_IDB_KEY),
    factory,
  );
  return key !== null;
}

/**
 * Whether a background-revalidated payload warrants the "Graph updated"
 * toast. Counts only, by design: label edits swap in silently (the canvas
 * simply re-renders), and comparing counts keeps this O(1) and PII-free.
 */
export function graphCountsChanged(previous: FullGraphPayload, next: FullGraphPayload): boolean {
  return previous.nodes.length !== next.nodes.length || previous.edges.length !== next.edges.length;
}
