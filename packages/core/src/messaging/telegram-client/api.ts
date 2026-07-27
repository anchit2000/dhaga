/**
 * Telegram Bot API HTTP calls (outbound send + media download). Retry/backoff
 * mirrors ../../search/firecrawl-client so a flaky Telegram hop is as resilient
 * as a flaky search hop. Never logs message text, chat ids, or the bot token
 * (the request URL embeds the token, so it is never surfaced in errors either).
 */

import type { DownloadedMedia, InboundMediaRef } from "../types";

const TELEGRAM_API_BASE = "https://api.telegram.org";
const TELEGRAM_TIMEOUT_MS = 10_000;
const TELEGRAM_MAX_RETRIES = 2;
const TELEGRAM_BACKOFF_BASE_MS = 500;
const TELEGRAM_BACKOFF_JITTER_MS = 250;

/** Transient HTTP statuses worth retrying (plus any 5xx). */
const RETRIABLE_HTTP_STATUSES: ReadonlySet<number> = new Set([408, 409, 429]);

function isRetriableStatus(status: number): boolean {
  return status >= 500 || RETRIABLE_HTTP_STATUSES.has(status);
}

function backoffDelayMs(attempt: number): number {
  return TELEGRAM_BACKOFF_BASE_MS * 2 ** attempt + Math.random() * TELEGRAM_BACKOFF_JITTER_MS;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface TelegramGetFileResponse {
  result?: { file_path?: string };
}

/**
 * Bounded retry with exponential backoff + jitter, retrying only transient
 * failures - network/abort/timeout rejections and HTTP 408/409/429/5xx. Other
 * 4xx (bad token, bad request) bail immediately. Error messages carry only the
 * HTTP status, never the URL (which embeds the bot token) or the payload.
 */
async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= TELEGRAM_MAX_RETRIES; attempt++) {
    let response: Response | null = null;
    try {
      response = await fetch(url, { ...init, signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS) });
    } catch (error) {
      // fetch() rejects on network/abort/timeout - transient, retry below.
      lastError = error instanceof Error ? error : new Error(String(error));
    }

    if (response) {
      if (response.ok) return response;
      lastError = new Error(`Telegram API request failed (HTTP ${response.status})`);
      // Non-transient 4xx won't get better on retry - fail fast.
      if (!isRetriableStatus(response.status)) throw lastError;
    }

    if (attempt < TELEGRAM_MAX_RETRIES) {
      await sleep(backoffDelayMs(attempt));
    }
  }

  throw lastError ?? new Error("Telegram API request failed");
}

/** POST sendMessage. Throws a descriptive Error on final failure; logs nothing. */
export async function sendTelegramText(token: string, chatId: string, text: string): Promise<void> {
  await fetchWithRetry(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

/** getFile -> download the binary at its file_path. Returns bytes + resolved mime type. */
export async function downloadTelegramMedia(
  token: string,
  media: InboundMediaRef,
): Promise<DownloadedMedia> {
  const infoRes = await fetchWithRetry(
    `${TELEGRAM_API_BASE}/bot${token}/getFile?file_id=${encodeURIComponent(media.id)}`,
    { method: "GET" },
  );
  const info = (await infoRes.json()) as TelegramGetFileResponse;
  const filePath = info.result?.file_path;
  if (!filePath) throw new Error("Telegram getFile returned no file_path");

  const fileRes = await fetchWithRetry(`${TELEGRAM_API_BASE}/file/bot${token}/${filePath}`, {
    method: "GET",
  });
  return {
    data: new Uint8Array(await fileRes.arrayBuffer()),
    mimeType: media.mimeType ?? "application/octet-stream",
  };
}
