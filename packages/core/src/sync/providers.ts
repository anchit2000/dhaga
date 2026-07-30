import { googleContactSyncProvider } from "./google-provider";
import { microsoftContactSyncProvider } from "./microsoft-provider";
import { CONTACT_SYNC_NO_ACCESS } from "./provider-types";
import type {
  ContactSyncCapabilities,
  ContactSyncProvider,
  ContactSyncProviderInfo,
} from "./provider-types";

/**
 * Registry of server-side address-book providers, mirroring the calendar
 * registry (../calendar/index.ts) and the messaging one: providers self-register
 * from the app that owns their credentials, and callers select by id.
 *
 * Kept separate from the `ContactSyncTarget` registry in ./index.ts because the
 * two hold different things. That one holds *targets* — including the mobile
 * device target, which has no OAuth at all — while this holds *providers* that
 * can run a consent flow and mint a target per connected account. Merging them
 * would force the device target to grow auth methods it will never have.
 */
const providerStore = globalThis as unknown as {
  __dhagaContactSyncProviders?: Map<string, ContactSyncProvider>;
};

/**
 * Google and Outlook ship built-in, seeded lazily the way the calendar registry
 * seeds its own. Safe to live in core, unlike the mobile device *target*: these
 * two are plain `fetch` against an HTTPS API with no native dependency, so
 * nothing here can pull expo-contacts into a web bundle.
 */
function builtIns(): ContactSyncProvider[] {
  return [googleContactSyncProvider, microsoftContactSyncProvider];
}

function providers(): Map<string, ContactSyncProvider> {
  providerStore.__dhagaContactSyncProviders ??= new Map<string, ContactSyncProvider>();
  const registry = providerStore.__dhagaContactSyncProviders;
  for (const provider of builtIns()) {
    if (!registry.has(provider.id)) registry.set(provider.id, provider);
  }
  return registry;
}

/** Register a provider. Returns a disposer. */
export function registerContactSyncProvider(provider: ContactSyncProvider): () => void {
  if (!provider.id.trim()) throw new Error("Contact sync provider id cannot be empty");
  providers().set(provider.id, provider);
  return () => {
    providers().delete(provider.id);
  };
}

export function getContactSyncProvider(id: string): ContactSyncProvider {
  const provider = providers().get(id);
  if (!provider) throw new Error(`Unknown contact sync provider "${id}"`);
  return provider;
}

export function hasContactSyncProvider(id: string): boolean {
  return providers().has(id);
}

/** Every registered provider, for the settings UI. Never exposes secrets. */
export function listContactSyncProviders(): ContactSyncProviderInfo[] {
  return [...providers().values()].map((provider) => ({
    id: provider.id,
    label: provider.label,
    configured: provider.isConfigured(),
  }));
}

/**
 * What a stored connection may do. Double-gated like the calendar equivalent:
 * the scope must grant it AND the provider must still be registered. An
 * unregistered or unknown provider id resolves to no access rather than
 * throwing, so one broken provider cannot take down a settings page that lists
 * every connection.
 */
export function contactSyncCapabilities(
  providerId: string,
  scope: string | null,
): ContactSyncCapabilities {
  try {
    return getContactSyncProvider(providerId).capabilitiesFromScope(scope);
  } catch {
    return CONTACT_SYNC_NO_ACCESS;
  }
}
