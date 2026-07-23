import { File, Paths } from "expo-file-system";

import type { ScanPayload } from "@/types";

/**
 * A single failed capture, persisted so an offline/failed POST /api/capture
 * isn't lost when the screen forgets it (the photo is nulled and the built
 * body lived only in function scope). Local-first requirement, CLAUDE.md
 * architecture principle #1: the capture survives even if the server is
 * unreachable. Stored to the document directory (safe from OS eviction) as
 * the already-built request body — OCR `raw` text or the resized photo's
 * `imageBase64` — so a retry re-sends exactly what failed.
 *
 * One buffer only (no queue): a second failure replaces the first. Enough for
 * the "capture, notice it didn't send, retry" flow without conflict handling.
 */
const bufferFile = new File(Paths.document, "pending-capture.json");

export async function loadPendingCapture(): Promise<ScanPayload | null> {
  try {
    if (!bufferFile.exists) return null;
    return JSON.parse(await bufferFile.text()) as ScanPayload;
  } catch {
    // Missing/corrupt buffer — treat as nothing pending.
    return null;
  }
}

export function savePendingCapture(pending: ScanPayload): void {
  try {
    bufferFile.write(JSON.stringify(pending));
  } catch {
    // Best-effort: a failed persist just means this capture can't be retried.
  }
}

export function clearPendingCapture(): void {
  try {
    if (bufferFile.exists) bufferFile.delete();
  } catch {
    // Nothing to clear, or already gone.
  }
}
