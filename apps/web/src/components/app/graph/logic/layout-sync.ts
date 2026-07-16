import {
  GRAPH_LAYOUT_MAX_BYTES,
  GRAPH_LAYOUT_UPLOAD_DEBOUNCE_MS,
} from "@/utils/constants/graph";
import { toPositionRecord } from "./position-cache";
import type { PositionMap } from "../types";

let pending: ReturnType<typeof setTimeout> | null = null;

/**
 * Fire-and-forget upload of settled positions so the user's OTHER devices can
 * skip FA2 (run-layout's L2 tier). Module-wide debounce: rapid re-layouts
 * (background revalidation swaps, quick successive edits) coalesce into one
 * POST carrying the latest state. Callers only schedule when the settled hash
 * differs from the server copy that arrived with the payload, so a device
 * that rendered from L2 never re-uploads what the server already has.
 * Failures are swallowed — the layout is still cached locally, and the next
 * settle retries.
 */
export function scheduleLayoutUpload(hash: string, positions: PositionMap): void {
  if (typeof window === "undefined") return;
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => {
    pending = null;
    const body = JSON.stringify({ hash, positions: toPositionRecord(positions) });
    if (body.length > GRAPH_LAYOUT_MAX_BYTES) return; // the server would 413 it
    void fetch("/api/graph/layout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    }).catch(() => undefined);
  }, GRAPH_LAYOUT_UPLOAD_DEBOUNCE_MS);
}
