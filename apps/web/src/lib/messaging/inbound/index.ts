import type { MessagingClient, NormalizedInboundMessage } from "@dhaga/core/src/messaging";
import { withUserDb } from "@/lib/db/request-scope";
import { logActionError } from "@/lib/actions/resilience";
import { resolveOwnerUserId } from "@/app/api/telegram/route";
import { getPendingQuestion, resolveUserIdByIdentity } from "@/lib/repo/messaging";
import { isDoneDelimiter } from "@/utils/constants/messaging";
import { resolvePendingQuestion } from "../answer";
import { handleContent, handleDone } from "./content";
import { handleUnlinked } from "./link";

/**
 * Handle one inbound message end-to-end:
 *
 *   1. resolve the sender to a Dhaga user (self-host owner fallback when not
 *      hosted) — an unknown chat gets the link prompt, never silence;
 *   2. if a disambiguation question is open for this chat, let the message try
 *      to answer it (../answer) — an answer ends here, anything else releases
 *      the question and falls through;
 *   3. DONE closes the batch; everything else is content.
 *
 * Swallows every error (the webhook always returns 200) and logs only PII-free
 * metadata.
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

    const chat = { provider: msg.provider, externalId: msg.externalUserId };
    const pending = await withUserDb(userId, () => getPendingQuestion(chat));
    if (pending) {
      const outcome = await resolvePendingQuestion({ client, msg, userId, pending });
      if (outcome === "answered") return;
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
