/**
 * Structural mirrors of the expo-contacts record shapes the sync mapper reads
 * and writes.
 *
 * Declared here rather than imported from expo-contacts for the same reason
 * @/lib/contacts/map declares DeviceContact locally: the mapper is pure, and a
 * value import of the contacts package would drag a native module into a
 * plain-node unit test. These are structurally compatible with
 * `PartialContactDetails` / `ContactPatch` / the legacy `Contact`, and the
 * device target's `tsc` call sites are what prove it.
 *
 * Two date conventions live here and they are NOT interchangeable: the modern
 * class API uses months 1–12, the legacy API uses months 0–11 ("adjusted for
 * JavaScript Date"). Mixing them silently shifts every birthday by a month.
 */

export interface DeviceLabeled {
  id?: string;
  label?: string;
}

export interface DeviceEmailEntry extends DeviceLabeled {
  address?: string;
}

export interface DevicePhoneEntry extends DeviceLabeled {
  number?: string;
}

export interface DeviceUrlEntry extends DeviceLabeled {
  url?: string;
}

/** Android's nickname storage — the modern `nickname` scalar is iOS-only. */
export interface DeviceExtraNameEntry extends DeviceLabeled {
  name?: string;
}

export interface DevicePostalEntry extends DeviceLabeled {
  street?: string;
  city?: string;
  state?: string;
  region?: string;
  postcode?: string;
  country?: string;
}

/** Modern-API calendar date: month is 1–12. */
export interface DeviceDate {
  year?: number;
  month: number;
  day: number;
}

export interface DeviceDateEntry extends DeviceLabeled {
  date?: DeviceDate;
}

/** What `Contact.getAllDetails(SYNC_DETAIL_FIELDS)` hands back, per contact. */
export interface SyncDetails {
  id: string;
  fullName?: string | null;
  givenName?: string | null;
  familyName?: string | null;
  nickname?: string | null;
  company?: string | null;
  jobTitle?: string;
  emails?: DeviceEmailEntry[];
  phones?: DevicePhoneEntry[];
  urlAddresses?: DeviceUrlEntry[];
  addresses?: DevicePostalEntry[];
  extraNames?: DeviceExtraNameEntry[];
  birthday?: DeviceDate | null;
  dates?: DeviceDateEntry[];
}

/**
 * A partial write for `contact.patch()`. Every key is optional and only the
 * supplied ones are written — that is the whole reason patch exists here, and
 * why an absent key must never be emitted as `null`.
 */
export interface SyncPatch {
  givenName?: string | null;
  middleName?: string | null;
  familyName?: string | null;
  nickname?: string | null;
  extraNames?: DeviceExtraNameEntry[];
  company?: string | null;
  jobTitle?: string | null;
  emails?: DeviceEmailEntry[];
  phones?: DevicePhoneEntry[];
  urlAddresses?: DeviceUrlEntry[];
  addresses?: DevicePostalEntry[];
  birthday?: DeviceDate | null;
  dates?: DeviceDateEntry[];
}

/** Legacy-API calendar date: month is 0–11. */
export interface LegacyDate {
  day: number;
  month: number;
  year?: number;
  label?: string;
}

/**
 * The legacy `Contact` record accepted by `addContactAsync(contact,
 * containerId)`. Used for creates only — see @/lib/sync/device-target for why
 * the modern `Contact.create()` cannot be used to target a container.
 */
export interface LegacyCreateContact {
  contactType: "person";
  name: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  nickname?: string;
  company?: string;
  jobTitle?: string;
  emails?: { email: string; label: string }[];
  phoneNumbers?: { number: string; label: string }[];
  urlAddresses?: { url: string; label: string }[];
  addresses?: {
    label: string;
    street?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  }[];
  birthday?: LegacyDate;
  dates?: LegacyDate[];
}
