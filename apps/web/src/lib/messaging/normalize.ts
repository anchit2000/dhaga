import type { InboundMediaRef, InboundMessageContent } from "@dhaga/core/src/messaging";
import type { MessagingItemKind, MessagingRejection } from "@/utils/constants/messaging";

/**
 * Forward mapping: a provider-normalised InboundMessageContent → either the
 * persisted `{ kind, payload }` an item row stores (payload is jsonb, so it must
 * be a plain serialisable object — never a class instance), or a REJECTION the
 * webhook answers immediately.
 *
 * Rejecting at the door rather than storing a dud item is what makes "never
 * silently drop anything" true: the sender learns a voice note / video / empty
 * message went nowhere while they are still in the chat, instead of finding a
 * gap in a summary minutes later.
 *
 * Pure and side-effect free — `transcription` is passed IN (not read from the
 * gateway here) so the whole decision table is unit-testable both ways.
 */
export type NormalizedPayload =
  | { text: string }
  | { vcard: string; displayName: string | null }
  | { media: InboundMediaRef; caption: string | null }
  | { latitude: number; longitude: number; name: string | null };

export type NormalizedItem =
  | { accepted: true; kind: MessagingItemKind; payload: NormalizedPayload }
  | { accepted: false; rejection: MessagingRejection; description: string };

/** A short, PII-free noun for an attachment we can't act on ("video", "poll"). */
function describe(description: string | null): string {
  const trimmed = description?.trim();
  if (!trimmed || trimmed === "unknown") return "message like that";
  return trimmed;
}

export function normalizeContent(
  content: InboundMessageContent,
  options: { transcription: boolean },
): NormalizedItem {
  switch (content.type) {
    case "text":
      return content.text.trim().length === 0
        ? { accepted: false, rejection: "empty", description: "text" }
        : { accepted: true, kind: "text", payload: { text: content.text } };
    case "contact_card":
      return {
        accepted: true,
        kind: "contact_card",
        payload: { vcard: content.vcard, displayName: content.displayName },
      };
    case "media": {
      const { media, caption } = content;
      if (media.kind === "image") {
        return { accepted: true, kind: "image", payload: { media, caption } };
      }
      // Audio is only worth storing when something can transcribe it. With no
      // registered provider the sender is told so straight away — and the day
      // one is registered this branch stops firing on its own.
      if (media.kind === "audio") {
        return options.transcription
          ? { accepted: true, kind: "audio", payload: { media, caption } }
          : { accepted: false, rejection: "voice_unsupported", description: "voice note" };
      }
      // FUTURE: a ".vcf sent as a document" could be routed to contact_card here
      // once we sniff document filenames/mime types — deferred for v1.
      return { accepted: false, rejection: "unsupported_attachment", description: describe(media.kind) };
    }
    case "location":
      return {
        accepted: true,
        kind: "location",
        payload: { latitude: content.latitude, longitude: content.longitude, name: content.name },
      };
    case "unsupported":
      return {
        accepted: false,
        rejection: "unsupported_attachment",
        description: describe(content.description),
      };
  }
}
