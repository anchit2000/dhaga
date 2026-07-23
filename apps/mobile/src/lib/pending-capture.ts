import { File, Paths } from "expo-file-system";

import type { PendingCapture, ScanPayload } from "@/types";

/**
 * FIFO queue of failed captures, persisted so an offline/failed POST
 * /api/capture is never lost (the photo is nulled and the built body lived
 * only in function scope). Local-first requirement, CLAUDE.md architecture
 * principle #1: captures survive even if the server is unreachable. Stored to
 * the document directory (safe from OS eviction) as the already-built request
 * bodies — OCR `raw` text or the resized photo's `imageBase64` — so each retry
 * re-sends exactly what failed.
 *
 * The whole ordered array is written atomically on every change; appends never
 * overwrite an existing entry, so a second (third, …) failure is preserved and
 * retried in order.
 */
const queueFile = new File(Paths.document, "pending-capture.json");

export async function loadPendingQueue(): Promise<PendingCapture[]> {
  try {
    if (!queueFile.exists) return [];
    const parsed: unknown = JSON.parse(await queueFile.text());
    return Array.isArray(parsed) ? (parsed as PendingCapture[]) : [];
  } catch {
    // Missing/corrupt queue — treat as nothing pending.
    return [];
  }
}

/** Append a failed capture to the tail; returns the updated queue. */
export async function enqueuePendingCapture(payload: ScanPayload): Promise<PendingCapture[]> {
  const next = [...(await loadPendingQueue()), { ...payload, id: makeId() }];
  writeQueue(next);
  return next;
}

/** Remove the entry with this id (on successful resend); returns the updated queue. */
export async function dequeuePendingCapture(id: string): Promise<PendingCapture[]> {
  const next = (await loadPendingQueue()).filter((entry) => entry.id !== id);
  writeQueue(next);
  return next;
}

export async function countPendingCaptures(): Promise<number> {
  return (await loadPendingQueue()).length;
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function writeQueue(queue: PendingCapture[]): void {
  try {
    if (queue.length === 0) {
      if (queueFile.exists) queueFile.delete();
      return;
    }
    queueFile.write(JSON.stringify(queue));
  } catch {
    // Best-effort: a failed persist just means these captures can't be retried.
  }
}
