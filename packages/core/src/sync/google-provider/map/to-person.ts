import { parseImportantDate } from "../dates";
import { isBirthday, toGoogleType } from "./labels";
import type { SyncableContact } from "../../types";
import type { Address, ContactMethod } from "../../../schemas/contact-fields";
import type { GooglePerson, GooglePersonAddress, GooglePersonValue } from "../api-types";

/**
 * SyncableContact → People, plus the `updatePersonFields` mask.
 *
 * The mask is the load-bearing part. People's updateContact REPLACES every
 * collection named in the mask and leaves out every collection that is not — so
 * deriving the mask from exactly the fields we were handed is what makes
 * `ContactSyncTarget.patch`'s "write only these, touch nothing else" promise
 * true. A mask wider than the payload silently deletes the user's data.
 */

/**
 * The People collection behind each syncable field.
 *
 * `title` and `company` deliberately share one: People models both as
 * `organizations`, so writing either rewrites that collection and both values
 * have to be sent together or the untouched one is erased.
 */
export const PERSON_FIELD_BY_SYNC_FIELD: Record<keyof SyncableContact, string> = {
  name: "names",
  nickname: "nicknames",
  title: "organizations",
  company: "organizations",
  emails: "emailAddresses",
  phones: "phoneNumbers",
  links: "urls",
  addresses: "addresses",
  importantDates: "birthdays,events",
};

/** Every personField this provider reads. */
export const READ_PERSON_FIELDS = [
  "names",
  "nicknames",
  "organizations",
  "emailAddresses",
  "phoneNumbers",
  "urls",
  "addresses",
  "birthdays",
  "events",
].join(",");

function methodsTo(methods: ContactMethod[]): GooglePersonValue[] {
  return methods
    .filter((m) => m.value.trim())
    .map((m) => ({ value: m.value.trim(), type: toGoogleType(m.label) }));
}

function addressesTo(addresses: Address[]): GooglePersonAddress[] {
  return addresses.map((a) => ({
    streetAddress: a.street ?? undefined,
    city: a.city ?? undefined,
    region: a.region ?? undefined,
    postalCode: a.postalCode ?? undefined,
    country: a.country ?? undefined,
    type: toGoogleType(a.label),
  }));
}

export function syncableToPerson(fields: Partial<SyncableContact>): GooglePerson {
  const person: GooglePerson = {};

  if (fields.name !== undefined) {
    person.names = fields.name ? [{ unstructuredName: fields.name }] : [];
  }
  if (fields.nickname !== undefined) {
    person.nicknames = fields.nickname ? [{ value: fields.nickname }] : [];
  }
  if (fields.title !== undefined || fields.company !== undefined) {
    const organization = { name: fields.company ?? undefined, title: fields.title ?? undefined };
    person.organizations = organization.name || organization.title ? [organization] : [];
  }
  if (fields.emails !== undefined) person.emailAddresses = methodsTo(fields.emails);
  if (fields.phones !== undefined) person.phoneNumbers = methodsTo(fields.phones);
  if (fields.links !== undefined) person.urls = methodsTo(fields.links);
  if (fields.addresses !== undefined) person.addresses = addressesTo(fields.addresses);
  if (fields.importantDates !== undefined) {
    // A birthday Google cannot structure still round-trips via its `text`
    // escape hatch; a non-birthday one cannot (People `events` has no text
    // field), so an unparseable one is dropped rather than written as a wrong
    // date. Losing a fuzzy anniversary beats inventing a specific one.
    person.birthdays = fields.importantDates.filter((d) => isBirthday(d.label)).map((d) => {
      const date = parseImportantDate(d.value);
      return date ? { date } : { text: d.value };
    });
    person.events = fields.importantDates
      .filter((d) => !isBirthday(d.label))
      .map((d) => ({ date: parseImportantDate(d.value), type: "other" }))
      .filter((e): e is { date: NonNullable<typeof e.date>; type: string } => e.date !== null);
  }

  return person;
}

/** The `updatePersonFields` mask for exactly the fields being written. */
export function updateMaskFor(fields: Partial<SyncableContact>): string {
  const masks = new Set<string>();
  for (const key of Object.keys(fields) as (keyof SyncableContact)[]) {
    for (const part of PERSON_FIELD_BY_SYNC_FIELD[key].split(",")) masks.add(part);
  }
  return [...masks].join(",");
}
