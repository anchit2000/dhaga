import {
  capabilitiesFromScope,
  exchangeCode,
  getAuthUrl,
  isConfigured,
  refresh,
} from "./auth";
import { createMicrosoftContactTarget } from "./target";
import type { ContactSyncProvider } from "../provider-types";

/**
 * Outlook / Microsoft 365 contacts as a ContactSyncProvider.
 *
 * Narrower than the Google one by necessity, not by omission: Graph models a
 * contact with one url slot, one birthday and three fixed address slots, so
 * `links`, `importantDates` and `addresses` are declared unsupported and never
 * cross in either direction (./map.ts explains the deletion that declaring
 * prevents). Names, nicknames, job titles, companies, emails and phones sync
 * both ways.
 */
export const microsoftContactSyncProvider: ContactSyncProvider = {
  id: "microsoft",
  label: "Outlook Contacts",
  isConfigured,
  getAuthUrl,
  exchangeCode,
  refresh,
  capabilitiesFromScope,
  createTarget: createMicrosoftContactTarget,
};

export { createMicrosoftContactTarget } from "./target";
export { MICROSOFT_CONTACTS_READ_SCOPE, MICROSOFT_CONTACTS_WRITE_SCOPE } from "./auth";
export { MICROSOFT_UNSUPPORTED_FIELDS } from "./map";
