import { capitalizeLabel } from "@/lib/contacts/map";
import { BIRTHDAY_LABEL } from "@/utils/constants/sync";

import { deviceDateToValue } from "./dates";

import type { Address, ContactMethod, ImportantDate } from "@dhaga/core";
import type { SyncableContact } from "@dhaga/core/src/sync/types";
import type { DeviceLabeled, DevicePostalEntry, SyncDetails } from "./types";

/**
 * Device address book → SyncableContact. Pure, so the shape the server merges
 * against can be tested without a handset.
 *
 * Only the nine SyncableContact fields are read. Everything else the OS holds —
 * photos, notes, social profiles, relations — is deliberately left on the
 * device: Dhaga has no business round-tripping fields it does not manage.
 */

function toMethods<T extends DeviceLabeled>(
  entries: T[] | undefined,
  value: (entry: T) => string | undefined,
): ContactMethod[] {
  return (entries ?? [])
    .map((entry) => ({
      value: (value(entry) ?? "").trim(),
      label: capitalizeLabel(entry.label),
      note: null,
    }))
    .filter((method) => method.value.length > 0);
}

function toAddress(entry: DevicePostalEntry): Address {
  return {
    label: capitalizeLabel(entry.label),
    street: entry.street?.trim() || null,
    city: entry.city?.trim() || null,
    // The modern API exposes both `state` and `region`; iOS fills `state`,
    // Dhaga models one region line, so take whichever the platform gave us.
    region: entry.state?.trim() || entry.region?.trim() || null,
    postalCode: entry.postcode?.trim() || null,
    country: entry.country?.trim() || null,
    note: null,
  };
}

/** OS-formatted full name first; first + family only when it is missing. */
function readName(details: SyncDetails): string {
  const full = details.fullName?.trim();
  if (full) return full;
  return [details.givenName, details.familyName].filter(Boolean).join(" ").trim();
}

/** iOS keeps a `nickname` scalar; Android stores it as the first extra name. */
function readNickname(details: SyncDetails): string | null {
  return details.nickname?.trim() || details.extraNames?.[0]?.name?.trim() || null;
}

function readDates(details: SyncDetails): ImportantDate[] {
  const dates: ImportantDate[] = [];
  if (details.birthday) {
    dates.push({ label: BIRTHDAY_LABEL, value: deviceDateToValue(details.birthday), note: null });
  }
  for (const entry of details.dates ?? []) {
    if (!entry.date) continue;
    const label = capitalizeLabel(entry.label);
    // A label is the only thing that tells one anniversary from another, so an
    // unlabelled date is dropped rather than merged into a nameless bucket.
    if (!label) continue;
    dates.push({ label, value: deviceDateToValue(entry.date), note: null });
  }
  return dates;
}

export function detailsToSyncable(details: SyncDetails): SyncableContact {
  return {
    name: readName(details),
    nickname: readNickname(details),
    title: details.jobTitle?.trim() || null,
    company: details.company?.trim() || null,
    emails: toMethods(details.emails, (entry) => entry.address),
    phones: toMethods(details.phones, (entry) => entry.number),
    links: toMethods(details.urlAddresses, (entry) => entry.url),
    addresses: (details.addresses ?? []).map(toAddress),
    importantDates: readDates(details),
  };
}
