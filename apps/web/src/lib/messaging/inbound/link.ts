import type { MessagingClient, NormalizedInboundMessage } from "@dhaga/core/src/messaging";
import { consumeLinkToken, linkIdentity } from "@/lib/repo/messaging";
import {
  invalidTokenReply,
  linkedReply,
  looksLikeLinkToken,
  notRecognizedReply,
} from "@/utils/constants/messaging";

/**
 * A sender we don't know yet. Nothing is stored for an unlinked chat (we have
 * no tenant to store it in), so every branch REPLIES — an unknown chat must
 * never look like it worked.
 */
export async function handleUnlinked(
  client: MessagingClient,
  msg: NormalizedInboundMessage,
): Promise<void> {
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
