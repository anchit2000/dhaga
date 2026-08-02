"use server";

import { headers } from "next/headers";
import { requireUserId } from "@/lib/auth/guard";
import { getAuth } from "@/lib/auth/config";
import { socialProviderConfig } from "@/lib/auth/config/social";
import { enforceRateLimit, RateLimitError } from "@/lib/ratelimit";
import { getContactsProvider } from "@/lib/import/providers";
import { CONTACT_IMPORT_PROVIDERS, type ContactImportProviderId } from "@/utils/constants/auth";
import type { ImportCandidate } from "@/lib/import";

/** Which contacts providers are env-configured, so the UI gates buttons. */
export async function getContactProviderAvailabilityAction(): Promise<ContactImportProviderId[]> {
  await requireUserId();
  const configured = socialProviderConfig();
  return CONTACT_IMPORT_PROVIDERS.filter(({ id }) => id in configured).map(({ id }) => id);
}

type ProviderContactsResult =
  | { ok: true; candidates: ImportCandidate[] }
  | { ok: false; error: string; needsConnect?: boolean };

/**
 * Pull contacts from a connected OAuth provider via better-auth's
 * (auto-refreshing) getAccessToken. Without a linked account carrying the
 * contacts scope we signal `needsConnect` so the client runs linkSocial.
 */
export async function fetchProviderContactsAction(
  provider: ContactImportProviderId,
): Promise<ProviderContactsResult> {
  const userId = await requireUserId();
  const meta = CONTACT_IMPORT_PROVIDERS.find(({ id }) => id === provider);
  if (!meta) return { ok: false, error: "Unsupported provider." };

  try {
    await enforceRateLimit(userId, "import");
  } catch (error) {
    if (error instanceof RateLimitError) return { ok: false, error: error.message };
    throw error;
  }

  const needsConnect: ProviderContactsResult = {
    ok: false,
    needsConnect: true,
    error: `Connect your ${meta.label} account to import contacts.`,
  };
  const auth = await getAuth();
  let accessToken: string;
  let scopes: string[];
  try {
    const token = await auth.api.getAccessToken({
      body: { providerId: provider },
      headers: await headers(),
    });
    accessToken = token.accessToken;
    scopes = token.scopes;
  } catch {
    return needsConnect;
  }
  if (!accessToken || !scopes.includes(meta.scope)) return needsConnect;

  try {
    const candidates = await getContactsProvider(provider).fetchContacts(accessToken);
    return { ok: true, candidates };
  } catch {
    return { ok: false, error: `Couldn't fetch contacts from ${meta.label}. Try again in a moment.` };
  }
}
