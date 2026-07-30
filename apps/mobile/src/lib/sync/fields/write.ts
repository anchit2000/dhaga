import { DEFAULT_DEVICE_LABEL } from "@/utils/constants/sync";

import { isBirthdayLabel, toLegacyDate, valueToDeviceDate } from "./dates";

import type { Address, ContactMethod, ImportantDate } from "@dhaga/core";
import type { SyncableContact } from "@dhaga/core/src/sync/types";
import type { SyncPlatform } from "../containers";
import type { DeviceDate, DevicePostalEntry, LegacyCreateContact, SyncPatch } from "./types";

/**
 * SyncableContact → device write records. Pure.
 *
 * `syncableToPatch` emits a key ONLY for a field the server actually sent: an
 * absent key means "leave it alone", and emitting it as null instead would
 * erase a field Dhaga does not own. That distinction is the entire safety
 * property of the partial-write contract.
 */

/** Device labels are lowercase by convention; the OS supplies "other" itself. */
function deviceLabel(label: string | null): string {
  return label?.trim().toLowerCase() || DEFAULT_DEVICE_LABEL;
}

/**
 * Dhaga stores one display name; the address book stores parts. First token is
 * the given name, last is the family name, anything between is the middle name.
 * A heuristic, and wrong for some particles ("van der Berg"), but it is applied
 * to all three parts at once so a name written here can never leave a stale
 * middle name behind to corrupt the OS-rendered full name.
 */
export function splitName(name: string): {
  givenName: string | null;
  middleName: string | null;
  familyName: string | null;
} {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { givenName: null, middleName: null, familyName: null };
  if (parts.length === 1) return { givenName: parts[0], middleName: null, familyName: null };
  return {
    givenName: parts[0],
    middleName: parts.slice(1, -1).join(" ") || null,
    familyName: parts[parts.length - 1],
  };
}

interface WritableDate {
  label: string;
  date: DeviceDate;
}

function splitDates(dates: ImportantDate[]): { birthday: DeviceDate | null; rest: WritableDate[] } {
  let birthday: DeviceDate | null = null;
  const rest: WritableDate[] = [];
  for (const entry of dates) {
    // Verbatim values ("spring 2019") have no address-book representation.
    const date = valueToDeviceDate(entry.value);
    if (!date) continue;
    if (isBirthdayLabel(entry.label) && !birthday) birthday = date;
    else rest.push({ label: deviceLabel(entry.label), date });
  }
  return { birthday, rest };
}

function toPostal(address: Address): DevicePostalEntry {
  return {
    label: deviceLabel(address.label),
    street: address.street ?? undefined,
    city: address.city ?? undefined,
    state: address.region ?? undefined,
    postcode: address.postalCode ?? undefined,
    country: address.country ?? undefined,
  };
}

export function syncableToPatch(fields: Partial<SyncableContact>, platform: SyncPlatform): SyncPatch {
  const patch: SyncPatch = {};
  if (fields.name !== undefined) Object.assign(patch, splitName(fields.name));
  if (fields.nickname !== undefined) {
    // The `nickname` scalar is iOS-only; Android keeps nicknames in extraNames.
    if (platform === "android") {
      patch.extraNames = fields.nickname ? [{ name: fields.nickname }] : [];
    } else {
      patch.nickname = fields.nickname;
    }
  }
  if (fields.title !== undefined) patch.jobTitle = fields.title;
  if (fields.company !== undefined) patch.company = fields.company;
  if (fields.emails !== undefined) {
    patch.emails = fields.emails.map((m) => ({ address: m.value, label: deviceLabel(m.label) }));
  }
  if (fields.phones !== undefined) {
    patch.phones = fields.phones.map((m) => ({ number: m.value, label: deviceLabel(m.label) }));
  }
  if (fields.links !== undefined) {
    patch.urlAddresses = fields.links.map((m) => ({ url: m.value, label: deviceLabel(m.label) }));
  }
  if (fields.addresses !== undefined) patch.addresses = fields.addresses.map(toPostal);
  if (fields.importantDates !== undefined) {
    const { birthday, rest } = splitDates(fields.importantDates);
    patch.birthday = birthday;
    patch.dates = rest;
  }
  return patch;
}

/**
 * The record for the legacy `addContactAsync(contact, containerId)` create —
 * the only call in expo-contacts that can put a NEW contact in a chosen
 * container (see @/lib/sync/device-target). Returns null for a nameless
 * contact: the address book has nothing to key it on.
 */
export function syncableToLegacyContact(contact: SyncableContact): LegacyCreateContact | null {
  const name = contact.name.trim();
  if (!name) return null;
  const { givenName, middleName, familyName } = splitName(name);
  const { birthday, rest } = splitDates(contact.importantDates);
  const record: LegacyCreateContact = { contactType: "person", name };
  if (givenName) record.firstName = givenName;
  if (middleName) record.middleName = middleName;
  if (familyName) record.lastName = familyName;
  if (contact.nickname) record.nickname = contact.nickname;
  if (contact.company) record.company = contact.company;
  if (contact.title) record.jobTitle = contact.title;
  if (contact.emails.length) {
    record.emails = contact.emails.map((m) => ({ email: m.value, label: deviceLabel(m.label) }));
  }
  if (contact.phones.length) {
    record.phoneNumbers = contact.phones.map((m) => ({
      number: m.value,
      label: deviceLabel(m.label),
    }));
  }
  if (contact.links.length) {
    record.urlAddresses = contact.links.map((m) => ({ url: m.value, label: deviceLabel(m.label) }));
  }
  if (contact.addresses.length) {
    record.addresses = contact.addresses.map((address) => ({
      label: deviceLabel(address.label),
      street: address.street ?? undefined,
      city: address.city ?? undefined,
      region: address.region ?? undefined,
      postalCode: address.postalCode ?? undefined,
      country: address.country ?? undefined,
    }));
  }
  if (birthday) record.birthday = toLegacyDate(birthday);
  if (rest.length) record.dates = rest.map((entry) => toLegacyDate(entry.date, entry.label));
  return record;
}
