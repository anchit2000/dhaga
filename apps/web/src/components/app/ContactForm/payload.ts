import type { ContactMethod, ContactProfile } from "@dhaga/core";

const nullIfBlank = (value: string | null): string | null => {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
};

const cleanMethods = (items: ContactMethod[]): ContactMethod[] =>
  items
    .filter((method) => method.value.trim().length > 0)
    .map((method) => ({
      value: method.value.trim(),
      label: nullIfBlank(method.label),
      note: nullIfBlank(method.note),
    }));

/**
 * Turn live form state into the JSON payload the server action re-validates.
 * Entirely-empty repeatable rows (a stray "Add" the user never filled in) are
 * dropped so a blank job or phone never persists; the required-string fields
 * of dates/custom fields get a sensible fallback rather than failing Zod.
 */
export function buildProfilePayload(profile: ContactProfile): string {
  const cleaned: ContactProfile = {
    name: profile.name.trim(),
    nickname: nullIfBlank(profile.nickname),
    positions: profile.positions
      .filter((p) => (p.title ?? "").trim() || (p.company ?? "").trim())
      .map((p) => ({
        title: nullIfBlank(p.title),
        company: nullIfBlank(p.company),
        department: nullIfBlank(p.department),
        current: p.current,
        startedAt: nullIfBlank(p.startedAt),
        endedAt: nullIfBlank(p.endedAt),
        note: nullIfBlank(p.note),
      })),
    emails: cleanMethods(profile.emails),
    phones: cleanMethods(profile.phones),
    links: cleanMethods(profile.links),
    addresses: profile.addresses
      .filter((a) =>
        [a.street, a.city, a.region, a.postalCode, a.country, a.label].some(
          (field) => (field ?? "").trim(),
        ),
      )
      .map((a) => ({
        label: nullIfBlank(a.label),
        street: nullIfBlank(a.street),
        city: nullIfBlank(a.city),
        region: nullIfBlank(a.region),
        postalCode: nullIfBlank(a.postalCode),
        country: nullIfBlank(a.country),
        note: nullIfBlank(a.note),
      })),
    importantDates: profile.importantDates
      .filter((d) => d.value.trim().length > 0)
      .map((d) => ({
        label: d.label.trim() || "Date",
        value: d.value.trim(),
        note: nullIfBlank(d.note),
      })),
    customFields: profile.customFields
      .filter((c) => c.value.trim().length > 0 || c.label.trim().length > 0)
      .map((c) => ({ label: c.label.trim() || "Field", value: c.value.trim() })),
    location: nullIfBlank(profile.location),
  };
  return JSON.stringify(cleaned);
}
