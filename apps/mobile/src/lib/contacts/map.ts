import type { Address as DeviceAddress, Contact, Date as DeviceDate } from "expo-contacts/legacy";
import type { Address, ContactMethod, ImportantDate, Position } from "@dhaga/core";
import type { ImportContactInput } from "@dhaga/core/src/api/import";

/** Receipt notes are capped by the schema + /api/import at 2,000 chars. */
const RECEIPT_MAX = 2000;
const RECEIPT_BASE = "Imported from device contacts";

/** "mobile" → "Mobile", "work" → "Work"; empty/whitespace → null. */
function capitalizeLabel(label: string | undefined): string | null {
  const trimmed = label?.trim();
  if (!trimmed) return null;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/** Prefer the OS-formatted full name; fall back to first + last. */
function resolveName(c: Contact): string {
  const full = c.name?.trim();
  if (full) return full;
  return [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
}

function toMethods(entries: { value: string | undefined; label: string }[]): ContactMethod[] {
  return entries
    .map((e) => ({ value: (e.value ?? "").trim(), label: capitalizeLabel(e.label), note: null }))
    .filter((m) => m.value.length > 0);
}

function toPositions(c: Contact): Position[] {
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

/** expo-contacts months are 0-based (JS Date). ISO when the year is known. */
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
 * Map one expo-contacts device contact into an import candidate. Pure and
 * unit-testable (no expo runtime). Returns null when the contact has no name —
 * a nameless row is not a person worth importing.
 */
export function deviceContactToCandidate(c: Contact): ImportContactInput | null {
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
