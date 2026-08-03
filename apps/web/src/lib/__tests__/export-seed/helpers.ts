import { expect } from "vitest";
import { contactsToVCards } from "@/lib/export/formats";
import { vcardToCandidates } from "@/lib/import/vcard";
// One address builder for both export suites; duplicating it is how two
// fixtures drift into testing subtly different shapes.
import { address } from "../export-formats/helpers";
import type { ContactMethod, ContactProfile, SyncableContact } from "@dhaga/core";
import type { ExportContact } from "@/lib/export/data";

/**
 * Fixtures for the bulk-seed round trip: Dhaga row → vCard export → the app's
 * own vCard importer → the three-way merge. The importer stands in for the
 * phone's address book because it is the same ladder the file goes through
 * there — whatever this parse loses is what the first sync sees missing.
 */

export const method = (value: string, label: string | null = null): ContactMethod => ({
  value,
  label,
  note: null,
});

export const seedContact: ExportContact = {
  id: "seed-1",
  name: "Priya Raman",
  nickname: "Pri",
  title: "Head of Design",
  companyId: "c1",
  companyName: "Loomcraft",
  emails: [method("priya@loomcraft.example", "Work"), method("priya@personal.example")],
  phones: [method("+91 98765 43210", "Mobile")],
  links: [method("https://loomcraft.example/priya")],
  addresses: [
    // "Home" is the label a TYPE token could represent; "Studio" is one it
    // could not (resolveLabel only maps HOME/WORK/OTHER), so the pair covers
    // both halves of the label round trip.
    address("Home", "12 Bandra Road", "400050"),
    address("Studio", "4 Kala Ghoda Lane", "400001"),
  ],
  importantDates: [
    { label: "Birthday", value: "1988-03-04", note: null },
    { label: "Work anniversary", value: "2019-09-01", note: null },
  ],
  customFields: [],
  location: "Pune",
  tags: [],
  reachOutEveryDays: null,
  lastReachedOutAt: null,
  watchedForSignals: false,
  signalsScannedAt: null,
  starred: false,
  personKind: null,
  personKindBy: "model",
  personKindConfidence: null,
  personClassifiedAt: null,
  source: "manual",
  createdAt: new Date("2026-07-01T00:00:00Z"),
  updatedAt: new Date("2026-07-01T00:00:00Z"),
};

/** A contact with nothing but bare values — the common case in a real graph. */
export function unlabeledContact(i: number): ExportContact {
  return {
    ...seedContact,
    id: `bulk-${i}`,
    name: `Bulk Person ${i}`,
    nickname: null,
    emails: [method(`bulk${i}@example.com`), method(`bulk${i}@home.example`)],
    phones: [method(`+1 555 01${String(i).padStart(2, "0")}`)],
  };
}

/** The syncable projection of a Dhaga row — what the merge calls `local`. */
export function localSide(row: ExportContact): SyncableContact {
  return {
    name: row.name,
    nickname: row.nickname,
    title: row.title,
    company: row.companyName,
    emails: row.emails,
    phones: row.phones,
    links: row.links,
    addresses: row.addresses,
    importantDates: row.importantDates,
  };
}

/** The syncable projection of what the address book hands back — `remote`. */
export function remoteSide(profile: ContactProfile): SyncableContact {
  return {
    name: profile.name,
    nickname: profile.nickname,
    title: profile.positions[0]?.title ?? null,
    company: profile.positions[0]?.company ?? null,
    emails: profile.emails,
    phones: profile.phones,
    links: profile.links,
    addresses: profile.addresses,
    importantDates: profile.importantDates,
  };
}

/** Export one row and parse it straight back, as a phone import would. */
export function parseBack(row: ExportContact): ContactProfile {
  const candidates = vcardToCandidates(contactsToVCards([row]));
  expect(candidates).toHaveLength(1);
  return candidates[0].contact;
}
