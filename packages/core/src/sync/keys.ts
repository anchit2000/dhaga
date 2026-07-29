import type { Address, ContactMethod, ImportantDate } from "../schemas/contact-fields";
import type { MultiField } from "./types";

/**
 * Identity keys for multi-value fields. Two entries are "the same entry" when
 * their keys match, so a merge can tell an ADDED phone number apart from an
 * EDITED one — the distinction the whole additive-union rule rests on.
 *
 * Phone normalisation matches the existing import dedup (digits only) so a
 * number that arrives as "+91 98765 43210" from the device and "9876543210"
 * from a vCard resolves to one entry rather than two.
 */

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function methodKey(field: MultiField, m: ContactMethod): string {
  const value = m.value.trim();
  if (field === "phones") {
    const digits = digitsOnly(value);
    // Trailing 10 digits ignores country-code and trunk-prefix variance
    // ("+91 98765 43210" vs "098765 43210") without merging distinct numbers.
    return digits.length > 10 ? digits.slice(-10) : digits;
  }
  if (field === "links") return value.toLowerCase().replace(/\/+$/, "");
  return value.toLowerCase();
}

function addressKey(a: Address): string {
  return [a.street, a.city, a.region, a.postalCode, a.country]
    .map((p) => (p ?? "").trim().toLowerCase())
    .join("|");
}

function importantDateKey(d: ImportantDate): string {
  return `${d.label.trim().toLowerCase()}|${d.value.trim().toLowerCase()}`;
}

/** The identity key for one entry of a multi-value field. */
export function entryKey(field: MultiField, entry: unknown): string {
  if (field === "addresses") return addressKey(entry as Address);
  if (field === "importantDates") return importantDateKey(entry as ImportantDate);
  return methodKey(field, entry as ContactMethod);
}

/**
 * Deep equality for one entry, used to tell "unchanged" from "edited in place"
 * (same key, different label/note). Entries are flat objects of string|null,
 * so a key-wise compare is sufficient and avoids a JSON.stringify key-order trap.
 */
export function entriesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(objA), ...Object.keys(objB)]);
  for (const k of keys) {
    const va = objA[k] ?? null;
    const vb = objB[k] ?? null;
    if (va !== vb) return false;
  }
  return true;
}

/** Index a multi-value list by entry key, first occurrence winning. */
export function indexByKey(field: MultiField, list: readonly unknown[]): Map<string, unknown> {
  const out = new Map<string, unknown>();
  for (const entry of list) {
    const key = entryKey(field, entry);
    if (key.length > 0 && !out.has(key)) out.set(key, entry);
  }
  return out;
}
