import { hasMessagingProvider } from "@dhaga/core/src/messaging";
import { requireUserIdForPage } from "@/lib/auth/guard";
import {
  getActiveTokenForUser,
  listIdentitiesForUser,
  listUnfinishedBatches,
} from "@/lib/repo/messaging";
import { CAPTURE_LOG_UNFINISHED_LIMIT } from "@/utils/constants/capture-log";
import { MESSAGING_PROVIDERS, MESSAGING_PROVIDER_LABELS } from "@/utils/constants/messaging";
import { MessagingSettings } from "@/components/app/settings/MessagingSettings";

/** Privacy: a linked chat only ever surfaces its provider + the last 4 chars of
 *  the external id — never the full handle or phone number (CLAUDE.md privacy). */
function maskMessagingExternalId(externalId: string): string {
  return `···${externalId.slice(-4)}`;
}

/**
 * Inbound-messaging capture: the user's active link token + their linked chats,
 * plus each built-in channel's configured/label status. The token and identity
 * reads are cross-tenant routing-table lookups (see repo/messaging), so they
 * take the user id explicitly rather than relying on RLS. Display handles come
 * from server env and are optional.
 */
export async function MessagingSection() {
  const userId = await requireUserIdForPage();
  const [activeToken, identities] = await Promise.all([
    getActiveTokenForUser(userId),
    listIdentitiesForUser(userId),
  ]);
  // Sequential, and NOT folded into the Promise.all above: the two reads there
  // are cross-tenant routing lookups, this one is an RLS-scoped tenant read on
  // the request-scoped connection, and fanning getDb() out has exhausted the
  // three-connection tenant pool in this repo before.
  const unfinished = await listUnfinishedBatches(CAPTURE_LOG_UNFINISHED_LIMIT);
  const providers = MESSAGING_PROVIDERS.map((id) => ({
    id,
    label: MESSAGING_PROVIDER_LABELS[id],
    configured: hasMessagingProvider(id),
  }));
  return (
    <MessagingSettings
      providers={providers}
      activeToken={
        activeToken
          ? { token: activeToken.token, expiresAt: activeToken.expiresAt.toISOString() }
          : null
      }
      identities={identities.map((identity) => ({
        id: identity.id,
        provider: identity.provider,
        maskedId: maskMessagingExternalId(identity.externalId),
        linkedAt: identity.linkedAt.toISOString(),
      }))}
      unfinishedCount={unfinished.length}
      unfinishedLimit={CAPTURE_LOG_UNFINISHED_LIMIT}
      telegramBotUsername={process.env.TELEGRAM_BOT_USERNAME ?? null}
      whatsappNumber={process.env.WHATSAPP_BUSINESS_NUMBER ?? null}
    />
  );
}
