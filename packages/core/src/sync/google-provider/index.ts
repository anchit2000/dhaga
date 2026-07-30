import {
  capabilitiesFromScope,
  exchangeCode,
  getAuthUrl,
  isConfigured,
  refresh,
} from "./auth";
import { createGoogleContactTarget } from "./target";
import type { ContactSyncProvider } from "../provider-types";

/**
 * Google Contacts (People API) as a ContactSyncProvider.
 *
 * This is the provider that closes the Android gap. expo-contacts inserts a
 * RawContact with no ACCOUNT_TYPE, so a contact Dhaga CREATES on Android stays
 * on the handset and never reaches the user's Google account. Writing through
 * People instead puts it in the account directly, and Android then syncs it
 * down — the reverse of the iOS relay, where the OS does the propagating.
 */
export const googleContactSyncProvider: ContactSyncProvider = {
  id: "google",
  label: "Google Contacts",
  isConfigured,
  getAuthUrl,
  exchangeCode,
  refresh,
  capabilitiesFromScope,
  createTarget: createGoogleContactTarget,
};

export { createGoogleContactTarget } from "./target";
export { GOOGLE_CONTACTS_READ_SCOPE, GOOGLE_CONTACTS_WRITE_SCOPE } from "./auth";
