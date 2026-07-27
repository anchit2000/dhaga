import type { InboundMediaRef, InboundMessageContent } from "@dhaga/core/src/messaging";
import type { MessagingItemKind } from "@/utils/constants/messaging";

/**
 * Forward mapping: a provider-normalised InboundMessageContent → the persisted
 * `{ kind, payload }` an item row stores (payload is jsonb, so it must be a
 * plain serialisable object — never a class instance). Pure and side-effect
 * free so the webhook logic and its unit tests share one source of truth.
 *
 * `skip` lets the caller drop content with nothing to store (an empty text
 * message) without appending a useless item.
 */
export type NormalizedPayload =
  | { text: string }
  | { vcard: string; displayName: string | null }
  | { media: InboundMediaRef }
  | { latitude: number; longitude: number; name: string | null }
  | { description: string };

export interface NormalizedItem {
  kind: MessagingItemKind;
  payload: NormalizedPayload;
  skip: boolean;
}

/** A short, PII-light label for an attachment we don't process in v1. */
function describeMedia(media: InboundMediaRef): string {
  return `Unsupported ${media.kind} attachment`;
}

export function normalizeContent(content: InboundMessageContent): NormalizedItem {
  switch (content.type) {
    case "text":
      return { kind: "text", payload: { text: content.text }, skip: content.text.trim().length === 0 };
    case "contact_card":
      return {
        kind: "contact_card",
        payload: { vcard: content.vcard, displayName: content.displayName },
        skip: false,
      };
    case "media":
      // Only image/audio are processed in v1. video/document/sticker degrade to
      // an "unsupported" item so a mixed batch never breaks on one attachment.
      // FUTURE: a ".vcf sent as a document" could be routed to contact_card here
      // once we sniff document filenames/mime types — deferred for v1.
      if (content.media.kind === "image") return { kind: "image", payload: { media: content.media }, skip: false };
      if (content.media.kind === "audio") return { kind: "audio", payload: { media: content.media }, skip: false };
      return { kind: "unsupported", payload: { description: describeMedia(content.media) }, skip: false };
    case "location":
      return {
        kind: "location",
        payload: { latitude: content.latitude, longitude: content.longitude, name: content.name },
        skip: false,
      };
    case "unsupported":
      return { kind: "unsupported", payload: { description: content.description }, skip: false };
  }
}
