/**
 * Social sign-in providers Dhaga can offer. A provider shows up on the
 * login/signup screens only when its `<ID>_CLIENT_ID` + `<ID>_CLIENT_SECRET`
 * env vars are set on the server — see lib/auth/config/social.ts. Adding a
 * provider better-auth supports = one entry here, nothing else.
 */
export const SOCIAL_PROVIDERS = [
  { id: "google", label: "Google" },
  { id: "apple", label: "Apple" },
  { id: "facebook", label: "Facebook" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "microsoft", label: "Microsoft" },
  { id: "salesforce", label: "Salesforce" },
] as const;

export type SocialProviderId = (typeof SOCIAL_PROVIDERS)[number]["id"];

/**
 * Minimum sign-in password length. Matches better-auth's default `minPasswordLength`
 * (enforced server-side) — the single source of truth for every password-choosing
 * surface (reset, signup, in-app change) and the strength meter's floor.
 */
export const MIN_PASSWORD_LENGTH = 8;

export interface SocialProviderOption {
  id: SocialProviderId;
  label: string;
}

/** OAuth scopes for reading a provider's contacts (requested via linkSocial). */
export const GOOGLE_CONTACTS_SCOPE = "https://www.googleapis.com/auth/contacts.readonly";
export const MICROSOFT_CONTACTS_SCOPE = "Contacts.Read";

/**
 * Passkey sign-in error codes that mean "the ceremony didn't complete" rather
 * than "something failed" — the user dismissed the browser prompt, or no
 * passkey exists on this device. The WebAuthn API can't tell these apart (both
 * surface as a NotAllowedError → ERROR_CEREMONY_ABORTED), and
 * @better-auth/passkey maps a non-WebAuthn abort to AUTH_CANCELLED. We treat
 * both as a soft, non-error state and steer the user to another method instead
 * of showing a red failure — see components/app/auth/PasskeyButton.tsx.
 */
export const PASSKEY_CANCELLED_CODES = ["AUTH_CANCELLED", "ERROR_CEREMONY_ABORTED"] as const;

export type ContactImportProviderId = "google" | "microsoft";

export interface ContactImportProvider {
  id: ContactImportProviderId;
  label: string;
  /** The contacts read scope requested when connecting this provider. */
  scope: string;
}

/**
 * Social providers that can back a direct contact import. A button shows only
 * when the provider is also env-configured (see socialProviderConfig()).
 */
export const CONTACT_IMPORT_PROVIDERS: readonly ContactImportProvider[] = [
  { id: "google", label: "Google Contacts", scope: GOOGLE_CONTACTS_SCOPE },
  { id: "microsoft", label: "Outlook / Hotmail", scope: MICROSOFT_CONTACTS_SCOPE },
] as const;
