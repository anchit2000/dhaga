import type { Address, ContactMethod } from "@dhaga/core";
import type { ExportContact } from "@/lib/export/data";

/** Fixtures for the two export formats. Deliberately awkward values — quotes,
 *  commas, semicolons — because escaping is what these suites are about. */

export const method = (value: string, label: string | null = null): ContactMethod => ({
  value,
  label,
  note: null,
});

/** A populated address. No semicolons in any part: the importer unescapes a
 *  value before splitting it into components, so a `\;` inside one would land
 *  in the wrong field (a pre-existing tokenize.ts trait, shared with ORG). */
export const address = (
  label: string | null,
  street: string,
  postalCode: string | null = null,
): Address => ({
  label,
  street,
  city: "Mumbai",
  region: "Maharashtra",
  postalCode,
  country: "India",
  note: null,
});

export const contact: ExportContact = {
  id: "1",
  name: 'Sarah "SC" Chen, PhD',
  nickname: null,
  title: "VP, Payments",
  companyId: "c1",
  companyName: "Stripe; Inc",
  emails: [method("sarah@stripe.com")],
  phones: [method("+1 555 0100")],
  links: [method("https://stripe.com")],
  addresses: [],
  importantDates: [],
  customFields: [],
  location: "SF",
  tags: ["fintech"],
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
