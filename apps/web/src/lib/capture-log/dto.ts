import type { CaptureLogEntry, CaptureLogItem } from "@/lib/repo/messaging";
import type { CaptureLogEntryDto, CaptureLogItemDto } from "@/types/capture-log";
import { batchFailureLabel } from "@/utils/constants/messaging";
import { previewPayload, readOutcomeLink } from "./payload";

/**
 * Repo rows → what the client is allowed to see. Both mappings are total and
 * lossy on purpose:
 *
 * - the raw `error` code never crosses; it is resolved to its user-facing label
 *   here so the log and the chat reply say the same words about the same
 *   failure (see MESSAGING_BATCH_FAILURE_LABELS);
 * - the raw `payload`/`outcome` jsonb never crosses either. Only a narrowed
 *   preview and the ids the log links to do — a stored vCard body, a media
 *   handle or an unknown extra field has no business in a page bundle.
 */

export function toEntryDto(entry: CaptureLogEntry): CaptureLogEntryDto {
  return {
    id: entry.id,
    provider: entry.provider,
    status: entry.status,
    createdAt: entry.createdAt.toISOString(),
    processedAt: entry.processedAt ? entry.processedAt.toISOString() : null,
    summary: entry.summary,
    failureLabel: batchFailureLabel(entry.error),
    itemCount: entry.itemCount,
    unresolvedCount: entry.unresolvedCount,
  };
}

export function toItemDto(item: CaptureLogItem): CaptureLogItemDto {
  return {
    id: item.id,
    seq: item.seq,
    kind: item.kind,
    createdAt: item.createdAt.toISOString(),
    outcomeKind: item.outcomeKind,
    preview: previewPayload(item.kind, item.payload),
    link: readOutcomeLink(item.outcome),
  };
}
