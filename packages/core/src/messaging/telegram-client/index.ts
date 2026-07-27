/**
 * Telegram channel - a MessagingClient/MessagingProvider implementation of the
 * ../types contract (deep-import-only; parsing lives in ./parse, HTTP in ./api).
 *
 * ENV (read lazily at call time; REUSES the exact names the existing owner-only
 * helper apps/web/src/lib/telegram.ts already defines, so current deployments
 * keep working unchanged):
 *   - TELEGRAM_BOT_TOKEN      bot token; isConfigured() = Boolean(this)
 *   - TELEGRAM_WEBHOOK_SECRET the value Telegram echoes in the
 *                             `x-telegram-bot-api-secret-token` header. Unset =>
 *                             verifyInbound() FAILS CLOSED (rejects everything),
 *                             so a misconfigured deploy can never be spoofed.
 * (TELEGRAM_ALLOWED_CHAT_ID from that helper is owner-only routing and is NOT
 * used here - the gateway resolves senders via the messaging_identities table.)
 */

import { timingSafeEqual } from "node:crypto";

import { downloadTelegramMedia, sendTelegramText } from "./api";
import { TELEGRAM_PROVIDER_ID, parseTelegramUpdate } from "./parse";
import type {
  DownloadedMedia,
  InboundMediaRef,
  MessagingClient,
  MessagingProvider,
  MessagingProviderId,
  NormalizedInboundMessage,
  OutboundMessage,
} from "../types";

function botToken(): string | undefined {
  return process.env.TELEGRAM_BOT_TOKEN;
}

function requireBotToken(): string {
  const token = botToken();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  return token;
}

function webhookSecret(): string | undefined {
  return process.env.TELEGRAM_WEBHOOK_SECRET;
}

export class TelegramMessagingClient implements MessagingClient {
  readonly providerId: MessagingProviderId = TELEGRAM_PROVIDER_ID;

  /** Telegram has no GET hub.challenge handshake (unlike Meta/WhatsApp). */
  verifyWebhookChallenge(): string | null {
    return null;
  }

  /**
   * Constant-time compare of Telegram's `x-telegram-bot-api-secret-token`
   * header against the configured secret. FAILS CLOSED when the secret env is
   * unset - rejects all inbound rather than trusting an unauthenticated body.
   * Length-guards before timingSafeEqual (which throws on unequal lengths) and
   * never throws itself.
   */
  verifyInbound(input: { headers: Headers; rawBody: string }): boolean {
    const secret = webhookSecret();
    if (!secret) return false;
    const header = input.headers.get("x-telegram-bot-api-secret-token");
    if (!header) return false;
    const secretBuf = Buffer.from(secret);
    const headerBuf = Buffer.from(header);
    if (secretBuf.length !== headerBuf.length) return false;
    return timingSafeEqual(secretBuf, headerBuf);
  }

  parseInbound(rawBody: string): NormalizedInboundMessage[] {
    return parseTelegramUpdate(rawBody);
  }

  async sendText(message: OutboundMessage): Promise<void> {
    await sendTelegramText(requireBotToken(), message.externalUserId, message.text);
  }

  downloadMedia(media: InboundMediaRef): Promise<DownloadedMedia> {
    return downloadTelegramMedia(requireBotToken(), media);
  }
}

export const telegramProvider: MessagingProvider = {
  id: TELEGRAM_PROVIDER_ID,
  label: "Telegram",
  isConfigured(): boolean {
    return Boolean(botToken());
  },
  createClient(): MessagingClient {
    return new TelegramMessagingClient();
  },
};
