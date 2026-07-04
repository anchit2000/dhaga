import { SOCIAL_PROVIDERS, type SocialProviderOption } from "@/utils/constants/auth";

/**
 * Env-gated social sign-on. Each provider in SOCIAL_PROVIDERS activates when
 * `<ID>_CLIENT_ID` + `<ID>_CLIENT_SECRET` are set — no code change, no
 * providers hard-coded on. All six ids are built into better-auth.
 */

interface ProviderCredentials {
  clientId: string;
  clientSecret: string;
  tenantId?: string;
}

export function socialProviderConfig(): Record<string, ProviderCredentials> {
  const config: Record<string, ProviderCredentials> = {};
  for (const { id } of SOCIAL_PROVIDERS) {
    const prefix = id.toUpperCase();
    const clientId = process.env[`${prefix}_CLIENT_ID`];
    const clientSecret = process.env[`${prefix}_CLIENT_SECRET`];
    if (clientId && clientSecret) config[id] = { clientId, clientSecret };
  }
  if (config.microsoft) {
    config.microsoft.tenantId = process.env.MICROSOFT_TENANT_ID ?? "common";
  }
  return config;
}

/** For the login/signup pages: which providers to render buttons for. */
export function enabledSocialProviders(): SocialProviderOption[] {
  const configured = socialProviderConfig();
  return SOCIAL_PROVIDERS.filter(({ id }) => id in configured).map(({ id, label }) => ({
    id,
    label,
  }));
}

export function googleSignInConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}
