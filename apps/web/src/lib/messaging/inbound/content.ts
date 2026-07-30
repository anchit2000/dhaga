import { after } from "next/server";
import type { MessagingClient, NormalizedInboundMessage } from "@dhaga/core/src/messaging";
import { hasTranscription } from "@dhaga/core/src/transcription";
import { withUserDb } from "@/lib/db/request-scope";
import {
  appendSessionItem,
  getOpenSession,
  getOrCreateOpenSession,
  setSessionStatus,
} from "@/lib/repo/messaging";
import {
  ackFirstItemReply,
  emptyMessageReply,
  emptySessionReply,
  MESSAGING_SESSION_IDLE_MINUTES,
  processingReply,
  unsupportedAttachmentReply,
  voiceUnsupportedReply,
} from "@/utils/constants/messaging";
import { normalizeContent, type NormalizedItem } from "../normalize";
import { processMessagingSession } from "../process-session";

/** The one reply a refused message gets. Exhaustive over MessagingRejection. */
function rejectionReply(item: Extract<NormalizedItem, { accepted: false }>): string {
  switch (item.rejection) {
    case "empty":
      return emptyMessageReply();
    case "voice_unsupported":
      return voiceUnsupportedReply();
    case "unsupported_attachment":
      return unsupportedAttachmentReply(item.description);
  }
}

/** DONE: flush the open batch for processing, or say there's nothing to save. */
export async function handleDone(
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

/**
 * Normal content: refuse what we can't act on (with a reply — never a silent
 * drop), idle-flush any stale batch, then append this item.
 *
 * The refusal check runs FIRST and needs no DB at all: a voice note or a sticker
 * shouldn't open a batch, and the sender learns immediately. Voice is gated on
 * whether a transcription provider is registered, so the refusal disappears by
 * itself the day one is.
 */
export async function handleContent(
  client: MessagingClient,
  msg: NormalizedInboundMessage,
  userId: string,
): Promise<void> {
  const { provider, externalUserId: externalId } = msg;

  const normalized = normalizeContent(msg.content, { transcription: hasTranscription() });
  if (!normalized.accepted) {
    await client.sendText({ externalUserId: externalId, text: rejectionReply(normalized) });
    return;
  }

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
