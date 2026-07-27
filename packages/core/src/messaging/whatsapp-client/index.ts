/**
 * WhatsApp Cloud API channel for the inbound-messaging gateway (../types) —
 * one MessagingClient/MessagingProvider implementation, registered by ../index.
 *
 * Required env (read lazily at call time — keys may be added after boot):
 *   WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID  required for send/download
 *   WHATSAPP_VERIFY_TOKEN   webhook GET hub.challenge handshake
 *   WHATSAPP_APP_SECRET     X-Hub-Signature-256 HMAC — verifyInbound FAILS
 *                           CLOSED (returns false) when this is unset
 *   WHATSAPP_GRAPH_VERSION  optional, default "v21.0"
 *
 * isConfigured() gates only the send/download credentials; a deployment can
 * still receive & verify webhooks with just VERIFY_TOKEN/APP_SECRET set.
 */
import type {
  DownloadedMedia,
  InboundMediaRef,
  MessagingClient,
  MessagingProvider,
  NormalizedInboundMessage,
  OutboundMessage,
} from "../types";
import {
  downloadMedia as apiDownloadMedia,
  sendText as apiSendText,
  verifyInbound as apiVerifyInbound,
  verifyWebhookChallenge as apiVerifyWebhookChallenge,
} from "./api";
import { parseInbound as parseInboundBody } from "./parse";

export { synthesizeVCard } from "./vcard";
export { parseInbound } from "./parse";

export class WhatsAppMessagingClient implements MessagingClient {
  readonly providerId = "whatsapp";

  verifyWebhookChallenge(query: URLSearchParams): string | null {
    return apiVerifyWebhookChallenge(query);
  }

  verifyInbound(input: { headers: Headers; rawBody: string }): boolean {
    return apiVerifyInbound(input);
  }

  parseInbound(rawBody: string): NormalizedInboundMessage[] {
    return parseInboundBody(rawBody);
  }

  sendText(message: OutboundMessage): Promise<void> {
    return apiSendText(message);
  }

  downloadMedia(media: InboundMediaRef): Promise<DownloadedMedia> {
    return apiDownloadMedia(media);
  }
}

export const whatsappProvider: MessagingProvider = {
  id: "whatsapp",
  label: "WhatsApp",
  isConfigured: () => Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
  createClient: () => new WhatsAppMessagingClient(),
};
