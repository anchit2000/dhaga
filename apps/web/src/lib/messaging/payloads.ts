import type { InboundMediaRef } from "@dhaga/core/src/messaging";

/**
 * Backward reads: an item row's `payload` column is jsonb, so it comes back as
 * `unknown`. These pure guards narrow a stored payload to the shape the
 * processor expects for each kind, returning null when the shape is wrong (a
 * schema drift or a hand-tampered row) so the walker can skip it instead of
 * throwing mid-batch. Mirrors the forward mapping in ./normalize.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function readTextPayload(payload: unknown): string | null {
  return isRecord(payload) && typeof payload.text === "string" ? payload.text : null;
}

export function readContactCardPayload(
  payload: unknown,
): { vcard: string; displayName: string | null } | null {
  if (!isRecord(payload) || typeof payload.vcard !== "string") return null;
  return {
    vcard: payload.vcard,
    displayName: typeof payload.displayName === "string" ? payload.displayName : null,
  };
}

/** Media plus the caption it was sent with (rows stored before captions were
 *  kept simply read back with `caption: null`). */
export function readMediaPayload(
  payload: unknown,
): { media: InboundMediaRef; caption: string | null } | null {
  if (!isRecord(payload) || !isRecord(payload.media)) return null;
  const media = payload.media;
  if (typeof media.id !== "string" || typeof media.kind !== "string") return null;
  return {
    media: {
      id: media.id,
      mimeType: typeof media.mimeType === "string" ? media.mimeType : null,
      kind: media.kind as InboundMediaRef["kind"],
      filename: typeof media.filename === "string" ? media.filename : null,
    },
    caption: typeof payload.caption === "string" ? payload.caption : null,
  };
}

export function readLocationPayload(
  payload: unknown,
): { latitude: number; longitude: number; name: string | null } | null {
  if (!isRecord(payload) || typeof payload.latitude !== "number" || typeof payload.longitude !== "number") {
    return null;
  }
  return {
    latitude: payload.latitude,
    longitude: payload.longitude,
    name: typeof payload.name === "string" ? payload.name : null,
  };
}
