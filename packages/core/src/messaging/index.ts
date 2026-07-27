import { whatsappProvider } from "./whatsapp-client";
import { telegramProvider } from "./telegram-client";
import type { MessagingClient, MessagingProvider, MessagingProviderId } from "./types";

export type {
  DownloadedMedia,
  InboundMediaRef,
  InboundMessageContent,
  MessagingClient,
  MessagingProvider,
  MessagingProviderId,
  NormalizedInboundMessage,
  OutboundMessage,
} from "./types";

/**
 * Messaging gateway — mirrors the LLM gateway (../llm) and search gateway
 * (../search), with one deliberate difference: this registry holds MULTIPLE
 * simultaneously-active providers, selected BY ID at call time (the webhook
 * path decides which channel a request belongs to). It is NOT a single-default
 * "pick one" like the LLM/search factories — WhatsApp and Telegram are both
 * live at once. Adding a channel (a plugin "where anyone can add their own
 * social media") means a new MessagingClient/MessagingProvider implementation
 * plus one registerMessagingProvider() call — zero changes to callers
 * (Open/Closed, Dependency Inversion).
 *
 * DEEP-IMPORT-ONLY (see ./types) — never re-exported from the package root.
 */
const providerStore = globalThis as unknown as {
  __dhagaMessagingProviders?: Map<MessagingProviderId, MessagingProvider>;
};

function messagingProviders(): Map<MessagingProviderId, MessagingProvider> {
  if (!providerStore.__dhagaMessagingProviders) {
    const providers = new Map<MessagingProviderId, MessagingProvider>();
    // Seed the built-ins once, lazily (same discipline as searchProviders()).
    providers.set(whatsappProvider.id, whatsappProvider);
    providers.set(telegramProvider.id, telegramProvider);
    providerStore.__dhagaMessagingProviders = providers;
  }
  return providerStore.__dhagaMessagingProviders;
}

/** Register a channel supplied by this app or an external package. Returns a disposer. */
export function registerMessagingProvider(provider: MessagingProvider): () => void {
  if (!provider.id.trim()) throw new Error("Messaging provider id cannot be empty");
  messagingProviders().set(provider.id, provider);
  return () => {
    messagingProviders().delete(provider.id);
  };
}

/** Look up a registered channel by id; throws if none is registered under that id. */
export function getMessagingProvider(id: MessagingProviderId): MessagingProvider {
  const provider = messagingProviders().get(id);
  if (!provider) throw new Error(`Unknown messaging provider "${id}"`);
  return provider;
}

export function getMessagingClient(id: MessagingProviderId): MessagingClient {
  return getMessagingProvider(id).createClient();
}

/** True when the channel is registered AND its credentials are configured. */
export function hasMessagingProvider(id: MessagingProviderId): boolean {
  const provider = messagingProviders().get(id);
  return provider !== undefined && provider.isConfigured();
}

export function listMessagingProviders(): MessagingProvider[] {
  return [...messagingProviders().values()];
}
