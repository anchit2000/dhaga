import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/utils/format-date";
import { LINK_TOKEN_TTL_MINUTES } from "@/utils/constants/messaging";
import { MessagingLinkPanel, UnlinkButton } from "./MessagingSettingsClient";

interface ProviderStatus {
  id: string;
  label: string;
  configured: boolean;
}

interface LinkedIdentity {
  id: string;
  provider: string;
  maskedId: string;
  linkedAt: string;
}

/**
 * Inbound-messaging capture settings (presentational — all data is passed in,
 * no fetching here). Forward a contact/note/photo to the linked bot and
 * Dhaga turns the batch into people. Provider status comes from server env
 * (`configured`); the token + unlink interactivity lives in the client partner.
 */
export function MessagingSettings({
  providers,
  activeToken,
  identities,
  telegramBotUsername,
  whatsappNumber,
}: {
  providers: ProviderStatus[];
  activeToken: { token: string; expiresAt: string } | null;
  identities: LinkedIdentity[];
  telegramBotUsername: string | null;
  whatsappNumber: string | null;
}) {
  const labelByProvider = new Map(providers.map((provider) => [provider.id, provider.label]));

  function handleLine(id: string): string | null {
    if (id === "telegram" && telegramBotUsername) {
      return `Message us on Telegram @${telegramBotUsername}`;
    }
    if (id === "whatsapp" && whatsappNumber) return `WhatsApp: ${whatsappNumber}`;
    return null;
  }

  return (
    <div className="space-y-6 rounded-2xl border border-seam bg-panel p-5 sm:p-6">
      <div>
        <p className="text-sm font-medium text-paper">Messaging</p>
        <p className="mt-1 text-sm text-fog">
          Forward a contact, notes, or a photo to your Dhaga bot, then reply
          DONE — Dhaga creates and tags the contact. Idle batches auto-save after
          a while.
        </p>
      </div>

      <div className="space-y-3 border-t border-seam pt-4">
        {providers.map((provider) => {
          const handle = handleLine(provider.id);
          return (
            <div
              key={provider.id}
              className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm text-paper">{provider.label}</p>
                {handle ? <p className="truncate text-xs text-fog">{handle}</p> : null}
              </div>
              <Badge
                variant={provider.configured ? "outline" : "secondary"}
                className={provider.configured ? "border-amber/40 text-ember" : "text-fog"}
              >
                {provider.configured ? "Ready" : "Not configured"}
              </Badge>
            </div>
          );
        })}
      </div>

      <div className="space-y-3 border-t border-seam pt-4">
        <div>
          <p className="text-sm font-medium text-paper">Connect this chat</p>
          <p className="mt-1 text-sm text-fog">
            Generate a token, then send it to the bot from the chat you want to link.
          </p>
        </div>
        <MessagingLinkPanel activeToken={activeToken} ttlMinutes={LINK_TOKEN_TTL_MINUTES} />
      </div>

      <div className="space-y-3 border-t border-seam pt-4">
        <p className="text-sm font-medium text-paper">Linked chats</p>
        {identities.length > 0 ? (
          <ul className="divide-y divide-seam border-y border-seam">
            {identities.map((identity) => (
              <li key={identity.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-paper">
                    {labelByProvider.get(identity.provider) ?? identity.provider}
                    <span className="ml-2 font-mono text-xs text-fog">{identity.maskedId}</span>
                  </p>
                  <p className="text-xs text-fog">Linked {formatDate(new Date(identity.linkedAt))}</p>
                </div>
                <UnlinkButton identityId={identity.id} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-fog">No chats linked yet.</p>
        )}
      </div>
    </div>
  );
}
