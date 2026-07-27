/**
 * Inbound-messaging capture — the app-side handler for the WhatsApp/Telegram
 * bot. The webhook (app/api/messaging/[provider]/webhook) hands each normalised
 * message to handleInboundMessage; a completed batch is drained by
 * processMessagingSession (fired via `after()` on DONE / idle flush, or by the
 * idle sweeper). Server-only: pulls in DB + LLM libs, never import from a
 * "use client" component.
 */
export { handleInboundMessage } from "./inbound";
export { processMessagingSession } from "./process-session";
