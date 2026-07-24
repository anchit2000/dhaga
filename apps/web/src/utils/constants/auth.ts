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

export interface SocialProviderOption {
  id: SocialProviderId;
  label: string;
}

/** OAuth scopes for reading a provider's contacts (requested via linkSocial). */
export const GOOGLE_CONTACTS_SCOPE = "https://www.googleapis.com/auth/contacts.readonly";
export const MICROSOFT_CONTACTS_SCOPE = "Contacts.Read";

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
