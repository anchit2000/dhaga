/**
 * Inbound-messaging gateway CONTRACT — the counterpart to LLMClient (../llm)
 * and SearchClient (../search). A user forwards a WhatsApp/Telegram contact
 * card, text, or voice note to a bot; a provider normalises the platform's
 * webhook payload into our shape, we batch-process it into contacts.
 *
 * Provider-agnostic by design: `MessagingProviderId` is an OPEN string so a
 * third party can plug in their own social channel (a product requirement —
 * "a plugin where anyone can add their own social media") without editing core.
 * A new channel = a new MessagingClient/MessagingProvider implementation +
 * one registerMessagingProvider() call, zero changes to callers (Open/Closed,
 * Dependency Inversion).
 *
 * DEEP-IMPORT-ONLY. This subtree is NOT re-exported from the package root
 * barrel (src/index.ts) or src/services.ts — provider clients pull in heavy
 * server SDKs that break the mobile Hermes runtime, the same discipline as
 * ../voice. Import it as `@dhaga/core/src/messaging`.
 */

/** Open string so third parties can register their own channel. Built-ins live in @/utils/constants/messaging. */
export type MessagingProviderId = string;

/** A handle to media the user forwarded; the bytes are fetched later via downloadMedia(). */
export interface InboundMediaRef {
  id: string;
  mimeType: string | null;
  kind: "image" | "audio" | "video" | "document" | "sticker";
  filename: string | null;
}

/**
 * What a single forwarded message carries, discriminated on `type`. `unsupported`
 * is a first-class variant so a provider never has to throw on a payload it
 * can't map — it degrades to a description the batch processor can skip/log.
 */
export type InboundMessageContent =
  | { type: "text"; text: string }
  | { type: "contact_card"; vcard: string; displayName: string | null }
  | { type: "media"; media: InboundMediaRef; caption: string | null }
  | { type: "location"; latitude: number; longitude: number; name: string | null }
  | { type: "unsupported"; description: string };

/**
 * One inbound message after a provider has normalised its platform payload.
 * `externalUserId` identifies the sender on that platform; the webhook resolves
 * it to a Dhaga user_id via the cross-tenant messaging_identities routing table
 * before any tenant-scoped work happens.
 */
export interface NormalizedInboundMessage {
  provider: MessagingProviderId;
  externalUserId: string;
  externalUserName: string | null;
  messageId: string;
  timestamp: number | null;
  content: InboundMessageContent;
}

/** A reply the bot sends back to the sender (acks, link prompts, summaries). */
export interface OutboundMessage {
  externalUserId: string;
  text: string;
}

/** Raw bytes of a piece of forwarded media once downloaded from the provider. */
export interface DownloadedMedia {
  data: Uint8Array;
  mimeType: string;
}

/**
 * The runtime contract a channel implements. `verifyWebhookChallenge` is
 * optional because only some platforms (e.g. Meta/WhatsApp) do a GET
 * hub.challenge handshake; Telegram does not. `verifyInbound` authenticates
 * the POST body (signature/secret token) before we trust it.
 */
export interface MessagingClient {
  readonly providerId: MessagingProviderId;
  verifyWebhookChallenge?(query: URLSearchParams): string | null;
  verifyInbound(input: { headers: Headers; rawBody: string }): Promise<boolean> | boolean;
  parseInbound(rawBody: string): NormalizedInboundMessage[];
  sendText(message: OutboundMessage): Promise<void>;
  downloadMedia(media: InboundMediaRef): Promise<DownloadedMedia>;
}

/**
 * A complete channel plugin registration — keeps configuration discovery
 * (isConfigured) and client construction beside the human-readable label so a
 * settings UI can list channels without hard-coding provider names.
 */
export interface MessagingProvider {
  id: MessagingProviderId;
  label: string;
  isConfigured(): boolean;
  createClient(): MessagingClient;
}
