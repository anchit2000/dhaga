import { formatImportantDate } from "../dates";
import { fromGoogleLabel } from "./labels";
import type { SyncableContact } from "../../types";
import type { Address, ContactMethod, ImportantDate } from "../../../schemas/contact-fields";
import type { GooglePerson, GooglePersonAddress, GooglePersonValue } from "../api-types";

/**
 * People → SyncableContact. Reads only the nine syncable fields; photos,
 * biographies, memberships, relations and userDefined data are never touched,
 * so nothing Google holds beyond an address book's worth of detail enters the
 * graph through sync.
 */

function methodsFrom(values: GooglePersonValue[] | undefined): ContactMethod[] {
  return (values ?? [])
    .filter((v) => v.value?.trim())
    .map((v) => ({ value: v.value!.trim(), label: fromGoogleLabel(v), note: null }));
}

function addressesFrom(values: GooglePersonAddress[] | undefined): Address[] {
  return (values ?? []).map((a) => ({
    label: fromGoogleLabel(a),
    street: a.streetAddress?.trim() || null,
    city: a.city?.trim() || null,
    region: a.region?.trim() || null,
    postalCode: a.postalCode?.trim() || null,
    country: a.country?.trim() || null,
    note: null,
  }));
}

/**
 * Birthdays and other dates live in two different People collections, so both
 * are read. A date Google stored as free text (because it could not structure
 * it) is preserved verbatim rather than dropped.
 */
function datesFrom(person: GooglePerson): ImportantDate[] {
  const birthdays: ImportantDate[] = (person.birthdays ?? [])
    .map((b) => formatImportantDate(b.date) ?? b.text?.trim() ?? null)
    .filter((value): value is string => Boolean(value))
    .map((value) => ({ label: "Birthday", value, note: null }));

  const events: ImportantDate[] = (person.events ?? [])
    .map((e) => ({ label: fromGoogleLabel(e) ?? "Date", value: formatImportantDate(e.date) }))
    .filter((e): e is { label: string; value: string } => Boolean(e.value))
    .map((e) => ({ ...e, note: null }));

  return [...birthdays, ...events];
}

export function personToSyncable(person: GooglePerson): SyncableContact {
  const name = person.names?.[0];
  const organization = person.organizations?.[0];
  return {
    name: (name?.displayName || name?.unstructuredName || "").trim(),
    nickname: person.nicknames?.[0]?.value?.trim() || null,
    title: organization?.title?.trim() || null,
    company: organization?.name?.trim() || null,
    emails: methodsFrom(person.emailAddresses),
    phones: methodsFrom(person.phoneNumbers),
    links: methodsFrom(person.urls),
    addresses: addressesFrom(person.addresses),
    importantDates: datesFrom(person),
  };
}
