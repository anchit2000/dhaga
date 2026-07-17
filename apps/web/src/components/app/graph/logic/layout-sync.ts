import {
  GRAPH_LAYOUT_MAX_BYTES,
  GRAPH_LAYOUT_UPLOAD_DEBOUNCE_MS,
  GRAPH_LAYOUT_UPLOADED_KEY,
} from "@/utils/constants/graph";
import { toPositionRecord } from "./position-cache";
import type { PositionMap } from "../types";

type UploadMemoryStore = Pick<Storage, "getItem" | "setItem">;

let pending: ReturnType<typeof setTimeout> | null = null;

function defaultStore(): UploadMemoryStore | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

/**
 * Whether this browser already uploaded exactly this layout. Callers compare
 * against `payload.layout.hash`, but an IndexedDB-cached payload freezes the
 * PRE-upload server state — every warm/304 boot looked "not uploaded yet" and
 * re-POSTed an identical megabyte of positions (observed live). The uploaded
 * hash is remembered locally to break that loop.
 */
export function alreadyUploaded(hash: string, store: UploadMemoryStore | null): boolean {
  try {
    return store?.getItem(GRAPH_LAYOUT_UPLOADED_KEY) === hash;
  } catch {
    return false; // storage denied — worst case is a redundant, idempotent POST
  }
}

function rememberUpload(hash: string, store: UploadMemoryStore | null): void {
  try {
    store?.setItem(GRAPH_LAYOUT_UPLOADED_KEY, hash);
  } catch {
    // quota/denied — the next boot may re-POST once; harmless.
  }
}

/**
 * Fire-and-forget upload of settled positions so the user's OTHER devices can
 * skip FA2 (run-layout's L2 tier). Module-wide debounce: rapid re-layouts
 * (background revalidation swaps, quick successive edits) coalesce into one
 * POST carrying the latest state. Skipped when the server copy that came with
 * the payload already matches, or when this browser has already uploaded the
 * same hash (see alreadyUploaded). Failures are swallowed — the layout is
 * still cached locally, and the next settle retries.
 */
export function scheduleLayoutUpload(
  hash: string,
  positions: PositionMap,
  store: UploadMemoryStore | null = defaultStore(),
): void {
  if (typeof window === "undefined") return;
  if (alreadyUploaded(hash, store)) return;
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => {
    pending = null;
    const body = JSON.stringify({ hash, positions: toPositionRecord(positions) });
    if (body.length > GRAPH_LAYOUT_MAX_BYTES) return; // the server would 413 it
    void fetch("/api/graph/layout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    })
      .then((res) => {
        if (res.ok) rememberUpload(hash, store);
      })
      .catch(() => undefined);
  }, GRAPH_LAYOUT_UPLOAD_DEBOUNCE_MS);
}
