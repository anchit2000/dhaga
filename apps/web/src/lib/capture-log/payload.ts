import type { CaptureOutcomeLink, CapturePayloadPreview } from "@/types/capture-log";

/**
 * Narrowing for the two jsonb columns the capture log renders. Pure, and
 * deliberately paranoid: both columns are `unknown` by contract, they were
 * written by builds that have already changed shape once, and a row can be
 * hand-edited in psql. A log whose whole job is to explain what happened must
 * not be the thing that 500s the settings page — so every unrecognised shape
 * degrades to a stated "unreadable", never to a throw and never to a silent
 * blank that would read as "this message was empty".
 *
 * PRIVACY: these values are third-party PII (note text, names). They are
 * returned for rendering only — nothing here logs, and nothing may.
 */

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** A string worth showing. Whitespace-only is treated as absent, so a caption
 *  of " " renders as "no caption" rather than as a blank line. */
function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function preview(text: string | null): CapturePayloadPreview {
  return text === null ? { state: "empty" } : { state: "text", text };
}

const UNREADABLE: CapturePayloadPreview = { state: "unreadable" };

/**
 * What one forwarded message said, from its stored payload.
 *
 * Each kind is recognised by the key that PROVES the shape (`media`, `vcard`,
 * coordinates) rather than by the human-readable one, because the readable key
 * is the optional one: a photo forwarded with no caption is a perfectly valid
 * `{media}` row, and keying off `caption` would report it as corrupt.
 */
export function previewPayload(kind: string, payload: unknown): CapturePayloadPreview {
  const record = asRecord(payload);
  if (!record) return UNREADABLE;
  switch (kind) {
    case "text":
      return "text" in record ? preview(asText(record.text)) : UNREADABLE;
    case "image":
    case "audio":
      return "media" in record ? preview(asText(record.caption)) : UNREADABLE;
    case "contact_card":
      return "vcard" in record ? preview(asText(record.displayName)) : UNREADABLE;
    case "location":
      return previewLocation(record);
    // `unsupported` is stored precisely because nothing could be made of it;
    // saying so is the honest render, not a bug.
    case "unsupported":
      return UNREADABLE;
    default:
      return UNREADABLE;
  }
}

/** A pin shows its place name, falling back to the coordinates — the same
 *  choice `locationNoteBody` makes for the note, so the log and the saved note
 *  say the same thing about the same pin. */
function previewLocation(record: Record<string, unknown>): CapturePayloadPreview {
  const name = asText(record.name);
  if (name) return { state: "text", text: name };
  const latitude = asNumber(record.latitude);
  const longitude = asNumber(record.longitude);
  if (latitude === null || longitude === null) return UNREADABLE;
  return { state: "text", text: `${latitude}, ${longitude}` };
}

/** What a verdict pointed at. Every field is optional in storage, so an absent
 *  or malformed detail is an empty link set — a verdict is still worth showing
 *  without one. */
export function readOutcomeLink(outcome: unknown): CaptureOutcomeLink {
  const record = asRecord(outcome);
  return {
    contactId: record ? asText(record.contactId) : null,
    contactName: record ? asText(record.contactName) : null,
    noteId: record ? asText(record.noteId) : null,
    confirmationId: record ? asText(record.confirmationId) : null,
    reason: record ? asText(record.reason) : null,
  };
}
