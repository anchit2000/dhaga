/**
 * Deep links that turn account-linking into a scan instead of a retype.
 *
 * The token is a short code the sender has to get from Settings into the chat.
 * Typing it works, but it is the step people get wrong (and the codes exist in
 * an unambiguous alphabet precisely because retyping was the weak point), so
 * each channel gets a URL that carries the token for them:
 *
 * - Telegram supports a `?start=` payload: opening the link shows a START
 *   button, and pressing it sends `/start <token>` as an ordinary message. The
 *   payload alphabet Telegram allows (A–Z a–z 0–9 _ -) is a superset of
 *   LINK_TOKEN_ALPHABET, so no encoding is ever needed.
 * - WhatsApp has no equivalent, so `wa.me/<digits>?text=` pre-fills the message
 *   and the sender taps send. One tap instead of eight characters.
 *
 * Both return null when the channel's handle isn't configured — a QR that
 * opened a chat with nobody would be worse than no QR at all.
 */

/** Telegram one-scan link: opens the bot and sends `/start <token>` on tap. */
export function telegramLinkUrl(botUsername: string | null, token: string): string | null {
  const username = botUsername?.trim().replace(/^@/, "");
  if (!username || !token) return null;
  return `https://t.me/${username}?start=${encodeURIComponent(token)}`;
}

/** WhatsApp pre-filled-message link. wa.me takes DIGITS only — no +, no spaces. */
export function whatsappLinkUrl(businessNumber: string | null, token: string): string | null {
  const digits = businessNumber?.replace(/\D/g, "");
  if (!digits || !token) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(token)}`;
}

/** The deep link for a channel, or null when that channel can't be linked by scan. */
export function messagingLinkUrl(input: {
  provider: string;
  token: string;
  telegramBotUsername: string | null;
  whatsappNumber: string | null;
}): string | null {
  if (input.provider === "telegram") {
    return telegramLinkUrl(input.telegramBotUsername, input.token);
  }
  if (input.provider === "whatsapp") return whatsappLinkUrl(input.whatsappNumber, input.token);
  return null;
}
