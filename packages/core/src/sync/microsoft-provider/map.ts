import type { SyncableContact, SyncField } from "../types";
import type { ContactMethod } from "../../schemas/contact-fields";
import type { GraphContact } from "./api-types";

/**
 * Microsoft Graph ⇄ SyncableContact.
 *
 * WHAT DOES NOT CROSS, AND WHY IT IS DECLARED RATHER THAN ATTEMPTED:
 * Graph gives a contact ONE url (`businessHomePage`), ONE date (`birthday`) and
 * THREE fixed address slots (home/business/other) — not lists. A contact with a
 * LinkedIn and a personal site, or a birthday and an anniversary, cannot be
 * represented. Mapping them anyway would be worse than not syncing them: the
 * field would read back short, and on the second run — once the base snapshot
 * had recorded the full value as synced — the merge would honour the shortfall
 * as a deliberate deletion and destroy the user's data.
 *
 * So `links`, `importantDates` and `addresses` are declared UNSUPPORTED (see
 * ./target.ts) and neutralised before the merge ever sees them. Outlook sync
 * covers name, nickname, job title, company, emails and phones — the fields
 * Graph actually models as an address book — and leaves the rest strictly
 * alone in both directions.
 */

export const MICROSOFT_UNSUPPORTED_FIELDS: readonly SyncField[] = [
  "links",
  "addresses",
  "importantDates",
];

/** Phone labels Graph can round-trip, by the array they live in. */
const MOBILE_LABEL = "Mobile";
const HOME_LABEL = "Home";
const WORK_LABEL = "Work";

function method(value: string, label: string | null): ContactMethod {
  return { value, label, note: null };
}

function phonesFrom(contact: GraphContact): ContactMethod[] {
  const phones: ContactMethod[] = [];
  if (contact.mobilePhone?.trim()) phones.push(method(contact.mobilePhone.trim(), MOBILE_LABEL));
  for (const value of contact.businessPhones ?? []) {
    if (value?.trim()) phones.push(method(value.trim(), WORK_LABEL));
  }
  for (const value of contact.homePhones ?? []) {
    if (value?.trim()) phones.push(method(value.trim(), HOME_LABEL));
  }
  return phones;
}

/**
 * Back into Graph's three buckets. The first Mobile-labelled number wins the
 * single `mobilePhone` slot; anything unlabelled or otherwise labelled goes to
 * businessPhones, which is the only bucket Graph lets grow without limit — so
 * no number is dropped even when its label has nowhere to go.
 */
function phonesTo(phones: ContactMethod[]): Pick<GraphContact, "mobilePhone" | "businessPhones" | "homePhones"> {
  const home: string[] = [];
  const business: string[] = [];
  let mobile: string | undefined;

  for (const phone of phones) {
    const value = phone.value.trim();
    if (!value) continue;
    const label = phone.label?.trim().toLowerCase();
    if (label === "mobile" && !mobile) mobile = value;
    else if (label === "home") home.push(value);
    else business.push(value);
  }
  return { mobilePhone: mobile ?? "", businessPhones: business, homePhones: home };
}

export function graphToSyncable(contact: GraphContact): SyncableContact {
  return {
    name: (contact.displayName || [contact.givenName, contact.surname].filter(Boolean).join(" ")).trim(),
    nickname: contact.nickName?.trim() || null,
    title: contact.jobTitle?.trim() || null,
    company: contact.companyName?.trim() || null,
    emails: (contact.emailAddresses ?? [])
      .filter((e) => e.address?.trim())
      .map((e) => method(e.address!.trim(), e.name?.trim() || null)),
    phones: phonesFrom(contact),
    // Declared unsupported — reported empty and neutralised before the merge, so
    // these never read as a deletion of whatever Dhaga holds.
    links: [],
    addresses: [],
    importantDates: [],
  };
}

export function syncableToGraph(fields: Partial<SyncableContact>): GraphContact {
  const contact: GraphContact = {};
  if (fields.name !== undefined) contact.displayName = fields.name;
  if (fields.nickname !== undefined) contact.nickName = fields.nickname ?? "";
  if (fields.title !== undefined) contact.jobTitle = fields.title ?? "";
  if (fields.company !== undefined) contact.companyName = fields.company ?? "";
  if (fields.emails !== undefined) {
    contact.emailAddresses = fields.emails
      .filter((e) => e.value.trim())
      .map((e) => ({ address: e.value.trim(), name: e.label ?? e.value.trim() }));
  }
  if (fields.phones !== undefined) Object.assign(contact, phonesTo(fields.phones));
  return contact;
}
