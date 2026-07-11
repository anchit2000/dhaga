/**
 * Telegram bot support (docs/ideas.md #6 — chat-interface capture/query).
 * Owner-only: messages from any other chat are ignored. Server-only;
 * never log message contents (they're contact PII).
 */

import { timingSafeEqual } from "node:crypto";

export function telegramEnabled(): boolean {
  return Boolean(
    process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ALLOWED_CHAT_ID,
  );
}

export function isAllowedChat(chatId: number | string): boolean {
  return String(chatId) === process.env.TELEGRAM_ALLOWED_CHAT_ID;
}

/**
 * Telegram calls our webhook with this header, set during setWebhook. This is
 * the only thing standing between the public internet and contact capture —
 * compare with constant time so a wrong-length or wrong-content guess can't
 * be distinguished by response latency.
 */
export function verifyTelegramSecret(header: string | null): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const secretBuf = Buffer.from(secret);
  const headerBuf = Buffer.from(header);
  if (secretBuf.length !== headerBuf.length) return false;
  return timingSafeEqual(secretBuf, headerBuf);
}

export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // Delivery failures are non-fatal; Telegram will show nothing, the
    // capture itself already succeeded or failed independently.
  }
}

export const TELEGRAM_HELP = `Send me anything with a person in it — a signature, card text, an intro — and I'll save them to your graph.

Ask questions with a leading question mark:
?who did I meet in fintech

Commands:
/start — this help`;
