import type { MessagingItemOutcome } from "@/utils/constants/messaging";

/**
 * The capture log's wire shapes — what crosses the server/client boundary.
 *
 * They exist because the repo layer's own types (CaptureLogEntry/Item, see
 * lib/repo/messaging/sessions/audit) cannot cross it as-is: `Date` does not
 * survive a server-action round trip, and `payload`/`outcome` are `unknown`
 * jsonb that must be narrowed while still on the server. Narrowing there and
 * not in the component is the point — the client only ever receives shapes it
 * can render, so a hand-edited or legacy row can never reach React as a
 * surprise.
 */

/**
 * What one forwarded message actually said, once its stored payload has been
 * narrowed. Three states rather than a nullable string, because "we know this
 * carried no text" (a photo with no caption) and "we could not make sense of
 * what was stored" are different things to tell a user, and collapsing them
 * would quietly report schema drift as an empty message.
 */
export type CapturePayloadPreview =
  | { state: "text"; text: string }
  | { state: "empty" }
  | { state: "unreadable" };

/**
 * What a message's verdict points at, so the log can link straight to the
 * result. Every field is optional in storage (see ItemOutcomeDetail) and so
 * nullable here; `reason` is PII-free by construction.
 */
export interface CaptureOutcomeLink {
  contactId: string | null;
  contactName: string | null;
  noteId: string | null;
  confirmationId: string | null;
  reason: string | null;
}

/** The keyset position, ISO-encoded for the action boundary. Opaque to the UI,
 *  which only ever echoes it back. */
export interface CaptureLogCursorDto {
  createdAt: string;
  id: string;
}

/** One batch as the log lists it. `failureLabel` is resolved server-side via
 *  `batchFailureLabel`, so the raw stored error code never reaches the client. */
export interface CaptureLogEntryDto {
  id: string;
  provider: string;
  status: string;
  createdAt: string;
  processedAt: string | null;
  summary: string | null;
  failureLabel: string | null;
  itemCount: number;
  unresolvedCount: number;
}

/** One message inside a batch, in arrival order. */
export interface CaptureLogItemDto {
  id: string;
  seq: number;
  kind: string;
  createdAt: string;
  outcomeKind: MessagingItemOutcome | null;
  preview: CapturePayloadPreview;
  link: CaptureOutcomeLink;
}

export interface CaptureLogPageDto {
  entries: CaptureLogEntryDto[];
  nextCursor: CaptureLogCursorDto | null;
}
