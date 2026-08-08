/**
 * WhatsApp Cloud API HTTP + auth helpers (send / download / webhook verify).
 *
 * Env vars (read lazily from process.env at call time — credentials may be
 * added after the process starts):
 *   WHATSAPP_ACCESS_TOKEN      Bearer token for the Graph API (send + download)
 *   WHATSAPP_PHONE_NUMBER_ID   the business phone-number id that owns /messages
 *   WHATSAPP_VERIFY_TOKEN      shared secret for the GET hub.challenge handshake
 *   WHATSAPP_APP_SECRET        HMAC key for the X-Hub-Signature-256 POST check
 *   WHATSAPP_GRAPH_VERSION     Graph API version, optional (default "v21.0")
 *
 * PII discipline: never log the message body or the recipient id — errors
 * carry HTTP status only (see ./http).
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";
import type { DownloadedMedia, InboundMediaRef, OutboundMessage } from "../types";
import { fetchWithRetry } from "./http";

const GRAPH_BASE_URL = "https://graph.facebook.com";
const DEFAULT_GRAPH_VERSION = "v21.0";

function graphVersion(): string {
  return process.env.WHATSAPP_GRAPH_VERSION || DEFAULT_GRAPH_VERSION;
}

/**
 * Read a credential from the environment, TRIMMED.
 *
 * Not defensive tidiness — an untrimmed value fails in a way that points
 * nowhere near its cause. A token carrying a leading U+FEFF (a BOM, which is
 * what a Windows shell pipe or an editor "UTF-8 with BOM" save prepends, and
 * which is invisible everywhere you would look at it) makes
 * `new Headers({ Authorization: \`Bearer ${token}\` })` throw
 * "Cannot convert argument to a ByteString because the character at index 7 has
 * a value of 65279" — a TypeError from deep inside undici, on a line that
 * mentions no credential at all. A trailing newline from a copy-paste into a
 * dashboard field does the same. `trim()` removes both: U+FEFF is WhiteSpace
 * per the ECMAScript spec, so this is one call, not a special case.
 *
 * Empty-after-trim is treated as unset, since a whitespace-only value is a
 * misconfiguration, not a credential.
 */
function requiredEnv(name: "WHATSAPP_ACCESS_TOKEN" | "WHATSAPP_PHONE_NUMBER_ID"): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set — WhatsApp messaging is unavailable`);
  return value;
}

function accessToken(): string {
  return requiredEnv("WHATSAPP_ACCESS_TOKEN");
}

function phoneNumberId(): string {
  return requiredEnv("WHATSAPP_PHONE_NUMBER_ID");
}

/**
 * Meta subscribe handshake (GET). Returns the challenge to echo back only when
 * the mode is "subscribe" AND the presented verify token matches ours. Returns
 * null when the verify token is unset — we cannot validate, so we do not echo.
 */
export function verifyWebhookChallenge(query: URLSearchParams): string | null {
  // Trimmed for the same reason as the credentials above, with a worse failure
  // mode: this one is an equality check, so an invisible character means the
  // handshake simply 403s and Meta reports "the callback URL could not be
  // validated" — with nothing anywhere to say the token was the problem.
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
  if (!verifyToken) return null;
  if (query.get("hub.mode") === "subscribe" && query.get("hub.verify_token") === verifyToken) {
    return query.get("hub.challenge");
  }
  return null;
}

/**
 * Authenticate an inbound webhook POST via its X-Hub-Signature-256 header:
 * `sha256=` + HMAC-SHA256(rawBody, WHATSAPP_APP_SECRET), constant-time compared.
 *
 * FAIL CLOSED: if WHATSAPP_APP_SECRET is unset we cannot authenticate the
 * payload, so we refuse it (return false) rather than trust an unverified body.
 * Never throws on a bad/short/malformed signature — always returns a boolean.
 */
export function verifyInbound(input: { headers: Headers; rawBody: string }): boolean {
  // Trimmed: this is the HMAC key, so an invisible character changes every
  // signature we compute and EVERY inbound message is rejected as unauthorized
  // — indistinguishable from a genuinely forged payload.
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim();
  if (!appSecret) return false;
  const presented = input.headers.get("x-hub-signature-256");
  if (!presented) return false;
  const expected = `sha256=${createHmac("sha256", appSecret).update(input.rawBody, "utf8").digest("hex")}`;
  const expectedBuf = Buffer.from(expected, "utf8");
  const presentedBuf = Buffer.from(presented, "utf8");
  // timingSafeEqual throws on length mismatch — guard first, then compare.
  if (expectedBuf.length !== presentedBuf.length) return false;
  try {
    return timingSafeEqual(expectedBuf, presentedBuf);
  } catch {
    return false;
  }
}

/** Send a plain-text reply to the sender. Never logs the body or recipient (PII). */
export async function sendText(message: OutboundMessage): Promise<void> {
  const url = `${GRAPH_BASE_URL}/${graphVersion()}/${phoneNumberId()}/messages`;
  const body = JSON.stringify({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: message.externalUserId,
    type: "text",
    text: { preview_url: false, body: message.text },
  });
  await fetchWithRetry(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken()}`,
      },
      body,
    },
    "WhatsApp send",
  );
}

/**
 * Two-step media fetch: resolve the media id to a short-lived download URL
 * (`{ url, mime_type }`), then fetch the binary from it. Both hops carry the
 * Bearer token. The caller's declared mimeType wins; the Graph metadata is a
 * fallback, then a generic octet-stream.
 */
export async function downloadMedia(media: InboundMediaRef): Promise<DownloadedMedia> {
  const token = accessToken();
  const authHeaders = { Authorization: `Bearer ${token}` };

  const metaResponse = await fetchWithRetry(
    `${GRAPH_BASE_URL}/${graphVersion()}/${media.id}`,
    { method: "GET", headers: authHeaders },
    "WhatsApp media lookup",
  );
  const meta = (await metaResponse.json()) as unknown;
  const metaRecord = typeof meta === "object" && meta !== null ? (meta as Record<string, unknown>) : {};
  const downloadUrl = typeof metaRecord.url === "string" ? metaRecord.url : null;
  const metaMime = typeof metaRecord.mime_type === "string" ? metaRecord.mime_type : null;
  if (!downloadUrl) throw new Error("WhatsApp media lookup returned no download URL");

  const binaryResponse = await fetchWithRetry(
    downloadUrl,
    { method: "GET", headers: authHeaders },
    "WhatsApp media download",
  );
  return {
    data: new Uint8Array(await binaryResponse.arrayBuffer()),
    mimeType: media.mimeType ?? metaMime ?? "application/octet-stream",
  };
}
