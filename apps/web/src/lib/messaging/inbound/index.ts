import type { MessagingClient, NormalizedInboundMessage } from "@dhaga/core/src/messaging";
import { logActionError } from "@/lib/actions/resilience";
import { resolveOwnerUserId } from "@/app/api/telegram/route";
import { resolveUserIdByIdentity } from "@/lib/repo/messaging";
import { alreadyLinkedReply, isDoneDelimiter, parseStartCommand } from "@/utils/constants/messaging";
import { handleContent, handleDone } from "./content";
import { handleUnlinked } from "./link";

/**
 * Handle one inbound message end-to-end:
 *
 *   1. resolve the sender to a Dhaga user (self-host owner fallback when not
 *      hosted) — an unknown chat gets the link prompt, never silence;
 *   2. DONE closes the batch; everything else is content.
 *
 * There is deliberately NO conversational state here. "Which person did you
 * mean?" is raised as a confirmation in the app's inbox instead of asked in
 * chat, because chat could only ever carry one open question per chat — which
 * capped a batch at one resolvable ambiguity and silently turned every other one
 * into a duplicate person.
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

    if (msg.content.type === "text") {
      // `/start` is a greeting, not content — Telegram sends it on every open,
      // and a scanned link sends it with the token attached. Either way this
      // chat is ALREADY linked, so storing it would put "/start ABCD2345" in
      // the batch as if it were a note about somebody.
      if (parseStartCommand(msg.content.text)) {
        await client.sendText({ externalUserId: msg.externalUserId, text: alreadyLinkedReply() });
        return;
      }
      if (isDoneDelimiter(msg.content.text)) {
        await handleDone(client, msg, userId);
        return;
      }
    }
    await handleContent(client, msg, userId);
  } catch (error) {
    logActionError("messaging_inbound", error);
  }
}
