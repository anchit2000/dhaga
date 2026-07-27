import { after } from "next/server";
import type { MessagingClient, NormalizedInboundMessage } from "@dhaga/core/src/messaging";
import { withUserDb } from "@/lib/db/request-scope";
import { logActionError } from "@/lib/actions/resilience";
import { resolveOwnerUserId } from "@/app/api/telegram/route";
import {
  appendSessionItem,
  consumeLinkToken,
  getOpenSession,
  getOrCreateOpenSession,
  linkIdentity,
  resolveUserIdByIdentity,
  setSessionStatus,
} from "@/lib/repo/messaging";
import {
  ackFirstItemReply,
  emptySessionReply,
  invalidTokenReply,
  isDoneDelimiter,
  linkedReply,
  looksLikeLinkToken,
  MESSAGING_SESSION_IDLE_MINUTES,
  notRecognizedReply,
  processingReply,
} from "@/utils/constants/messaging";
import { normalizeContent } from "./normalize";
import { processMessagingSession } from "./process-session";

/** Route table for a sender we don't yet know: redeem a link token, else prompt. */
async function handleUnlinked(client: MessagingClient, msg: NormalizedInboundMessage): Promise<void> {
  const { externalUserId } = msg;
  if (msg.content.type === "text" && looksLikeLinkToken(msg.content.text)) {
    const consumed = await consumeLinkToken(msg.content.text.trim());
    if (consumed) {
      await linkIdentity({
        provider: msg.provider,
        externalId: externalUserId,
        externalName: msg.externalUserName,
        userId: consumed.userId,
      });
      await client.sendText({ externalUserId, text: linkedReply() });
    } else {
      await client.sendText({ externalUserId, text: invalidTokenReply() });
    }
    return;
  }
  await client.sendText({ externalUserId, text: notRecognizedReply() });
}

/** DONE: flush the open batch for processing, or say there's nothing to save. */
async function handleDone(
  client: MessagingClient,
  msg: NormalizedInboundMessage,
  userId: string,
): Promise<void> {
  const { provider, externalUserId: externalId } = msg;
  const flushed = await withUserDb(userId, async () => {
    const session = await getOpenSession({ provider, externalId });
    if (!session || session.itemCount === 0) return null;
    await setSessionStatus({ sessionId: session.id, status: "processing" });
    return { id: session.id, itemCount: session.itemCount };
  });
  if (!flushed) {
    await client.sendText({ externalUserId: externalId, text: emptySessionReply() });
    return;
  }
  await client.sendText({ externalUserId: externalId, text: processingReply(flushed.itemCount) });
  after(() => processMessagingSession(userId, { id: flushed.id, provider, externalId }));
}

/** Normal content: idle-flush any stale batch, then append this item. */
async function handleContent(
  client: MessagingClient,
  msg: NormalizedInboundMessage,
  userId: string,
): Promise<void> {
  const { provider, externalUserId: externalId } = msg;

  // IDLE SELF-FLUSH: if the open batch has gone quiet past the idle window,
  // close it for processing so this new item starts a fresh batch.
  const toFlush = await withUserDb(userId, async () => {
    const existing = await getOpenSession({ provider, externalId });
    const idleMs = MESSAGING_SESSION_IDLE_MINUTES * 60000;
    if (existing && Date.now() - existing.lastItemAt.getTime() > idleMs) {
      await setSessionStatus({ sessionId: existing.id, status: "processing" });
      return { id: existing.id, provider, externalId };
    }
    return null;
  });
  if (toFlush) after(() => processMessagingSession(userId, toFlush));

  const normalized = normalizeContent(msg.content);
  if (normalized.skip) return;

  const appended = await withUserDb(userId, async () => {
    const session = await getOrCreateOpenSession({ provider, externalId });
    const result = await appendSessionItem({
      sessionId: session.id,
      kind: normalized.kind,
      payload: normalized.payload,
      providerMessageId: msg.messageId,
    });
    return { duplicate: result.duplicate, wasFirst: session.itemCount === 0 };
  });
  if (appended.duplicate) return; // idempotent provider retry
  // Ack only the first item — subsequent ones stay silent to avoid spam.
  if (appended.wasFirst) await client.sendText({ externalUserId: externalId, text: ackFirstItemReply() });
}

/**
 * Handle one inbound message end-to-end: resolve the sender to a Dhaga user
 * (self-host owner fallback when not hosted), then route to link / DONE /
 * normal-content flows. Swallows every error (the webhook always returns 200)
 * and logs only PII-free metadata.
 */
export async function handleInboundMessage(
  client: MessagingClient,
  msg: NormalizedInboundMessage,
): Promise<void> {
  try {
    let userId = await resolveUserIdByIdentity(msg.provider, msg.externalUserId);
    if (userId == null && process.env.DHAGA_HOSTED_MODE !== "true") {
      userId = await resolveOwnerUserId();
    }
    if (userId == null) {
      await handleUnlinked(client, msg);
      return;
    }
    if (msg.content.type === "text" && isDoneDelimiter(msg.content.text)) {
      await handleDone(client, msg, userId);
      return;
    }
    await handleContent(client, msg, userId);
  } catch (error) {
    logActionError("messaging_inbound", error);
  }
}
