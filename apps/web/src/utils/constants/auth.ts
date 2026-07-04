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
