import type { Address, ContactMethod, ImportantDate, Position } from "@dhaga/core";
import type { ImportContactInput } from "@dhaga/core/src/api/import";

/**
 * The device-contact shape this mapper consumes. Defined locally — not imported
 * from a native contacts package — so this module (and its web-run unit test)
 * pulls in no React-Native-only dependency. Field names and optionality mirror
 * the OS address-book contact, so a real device contact is assignable to
 * `DeviceContact` without a cast.
 */
export interface DeviceDate {
  day: number;
  month: number;
  year?: number;
}

export interface DeviceAddress {
  label?: string;
  street?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  id?: string;
}

export interface DeviceContact {
  contactType?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
  company?: string;
  jobTitle?: string;
  department?: string;
  note?: string;
  birthday?: DeviceDate;
  emails?: { email?: string; label?: string; id?: string }[];
  phoneNumbers?: { number?: string; label?: string; id?: string }[];
  addresses?: DeviceAddress[];
}

/** Receipt notes are capped by the schema + /api/import at 2,000 chars. */
const RECEIPT_MAX = 2000;
const RECEIPT_BASE = "Imported from device contacts";

/** "mobile" → "Mobile", "work" → "Work"; empty/whitespace → null. Shared with
 *  the two-way sync mapper (@/lib/sync/fields), which reads the same OS labels. */
export function capitalizeLabel(label: string | undefined): string | null {
  const trimmed = label?.trim();
  if (!trimmed) return null;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/** Prefer the OS-formatted full name; fall back to first + last. */
function resolveName(c: DeviceContact): string {
  const full = c.name?.trim();
  if (full) return full;
  return [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
}

function toMethods(entries: { value: string | undefined; label: string | undefined }[]): ContactMethod[] {
  return entries
    .map((e) => ({ value: (e.value ?? "").trim(), label: capitalizeLabel(e.label), note: null }))
    .filter((m) => m.value.length > 0);
}

function toPositions(c: DeviceContact): Position[] {
  const title = c.jobTitle?.trim() || null;
  const company = c.company?.trim() || null;
  const department = c.department?.trim() || null;
  if (!title && !company && !department) return [];
  return [{ title, company, department, current: true, startedAt: null, endedAt: null, note: null }];
}

function toAddress(a: DeviceAddress): Address {
  return {
    label: capitalizeLabel(a.label),
    street: a.street?.trim() || null,
    city: a.city?.trim() || null,
    region: a.region?.trim() || null,
    postalCode: a.postalCode?.trim() || null,
    country: a.country?.trim() || null,
    note: null,
  };
}

/** Device dates use 0-based months (JS `Date`). ISO when the year is known. */
function toBirthday(b: DeviceDate): ImportantDate {
  const mm = String(b.month + 1).padStart(2, "0");
  const dd = String(b.day).padStart(2, "0");
  const value = b.year ? `${b.year}-${mm}-${dd}` : `${mm}-${dd}`;
  return { label: "Birthday", value, note: null };
}

function buildReceipt(note: string | undefined): string {
  const trimmed = note?.trim();
  const receipt = trimmed ? `${RECEIPT_BASE}\nNote: ${trimmed}` : RECEIPT_BASE;
  return receipt.slice(0, RECEIPT_MAX);
}

/**
 * Map one device contact into an import candidate. Pure and unit-testable (no
 * device runtime needed). Returns null when the contact has no name — a
 * nameless row is not a person worth importing.
 */
export function deviceContactToCandidate(c: DeviceContact): ImportContactInput | null {
  const name = resolveName(c);
  if (!name) return null;
  return {
    contact: {
      name,
      nickname: c.nickname?.trim() || null,
      positions: toPositions(c),
      emails: toMethods((c.emails ?? []).map((e) => ({ value: e.email, label: e.label }))),
      phones: toMethods((c.phoneNumbers ?? []).map((p) => ({ value: p.number, label: p.label }))),
      links: [],
      addresses: (c.addresses ?? []).map(toAddress),
      importantDates: c.birthday ? [toBirthday(c.birthday)] : [],
      customFields: [],
      location: null,
    },
    receipt: buildReceipt(c.note),
  };
}
