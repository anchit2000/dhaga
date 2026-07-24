/**
 * Google People API contacts provider. The network fetch is thin — all field
 * mapping lives in the exported pure {@link googlePersonToCandidate} so it is
 * unit-testable without the network. Mirrors the vCard mapper's ContactProfile
 * style (labeled methods, one current position, importantDates, 2000-char
 * receipt). SERVER-ONLY.
 */
import { emptyContactProfile } from "@dhaga/core";
import type { ContactProfile } from "@dhaga/core";
import type { ImportCandidate } from "../types";
import type { ContactsProvider } from "./types";

const CONNECTIONS_URL = "https://people.googleapis.com/v1/people/me/connections";
const PERSON_FIELDS =
  "names,nicknames,emailAddresses,phoneNumbers,organizations,addresses,biographies,urls,birthdays";
const PAGE_SIZE = "1000";
/** Hard cap so a pathological account can never exhaust memory (Rule 12). */
const MAX_CONTACTS = 25_000;

interface GoogleTyped { value?: string; type?: string; formattedType?: string }
interface GoogleOrg { name?: string; title?: string; department?: string }
interface GoogleAddr { streetAddress?: string; city?: string; region?: string; postalCode?: string; country?: string; type?: string }
interface GoogleBday { text?: string; date?: { year?: number; month?: number; day?: number } }
export interface GooglePerson {
  names?: { displayName?: string }[];
  nicknames?: { value?: string }[];
  emailAddresses?: GoogleTyped[];
  phoneNumbers?: GoogleTyped[];
  organizations?: GoogleOrg[];
  addresses?: GoogleAddr[];
  urls?: GoogleTyped[];
  birthdays?: GoogleBday[];
  biographies?: { value?: string }[];
}
interface GoogleConnectionsResponse { connections?: GooglePerson[]; nextPageToken?: string }

/** Normalise a Google type/formattedType into a display label, or null. */
function labelize(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower === "home") return "Home";
  if (lower === "work") return "Work";
  if (lower === "mobile" || lower === "cell") return "Mobile";
  if (lower === "other") return "Other";
  return value; // custom label passes through verbatim
}
function methodLabel(entry: GoogleTyped): string | null {
  return labelize(entry.type) ?? labelize(entry.formattedType);
}

function birthdayValue(birthday: GoogleBday): string | null {
  if (birthday.text?.trim()) return birthday.text.trim();
  const date = birthday.date;
  if (!date) return null;
  const mm = date.month ? String(date.month).padStart(2, "0") : "";
  const dd = date.day ? String(date.day).padStart(2, "0") : "";
  if (date.year) return [String(date.year).padStart(4, "0"), mm, dd].filter(Boolean).join("-");
  return [mm, dd].filter(Boolean).join("-") || null;
}

function mapPosition(person: GooglePerson, profile: ContactProfile): void {
  const org = person.organizations?.[0];
  if (!org || (!org.title && !org.name)) return;
  profile.positions.push({
    title: org.title?.trim() || null,
    company: org.name?.trim() || null,
    department: org.department?.trim() || null,
    current: true,
    startedAt: null,
    endedAt: null,
    note: null,
  });
}

function mapAddresses(person: GooglePerson, profile: ContactProfile): void {
  for (const address of person.addresses ?? []) {
    const parts = {
      street: address.streetAddress?.trim() || null,
      city: address.city?.trim() || null,
      region: address.region?.trim() || null,
      postalCode: address.postalCode?.trim() || null,
      country: address.country?.trim() || null,
    };
    if (!parts.street && !parts.city && !parts.region && !parts.postalCode && !parts.country) continue;
    profile.addresses.push({ label: labelize(address.type), ...parts, note: null });
  }
  const first = profile.addresses[0];
  profile.location = first ? first.city ?? first.country : null;
}

/** Map one Google `person` to a review candidate, or null if it has no name. */
export function googlePersonToCandidate(person: GooglePerson): ImportCandidate | null {
  const name = person.names?.[0]?.displayName?.trim();
  if (!name) return null;
  const profile = emptyContactProfile();
  profile.name = name;
  profile.nickname = person.nicknames?.[0]?.value?.trim() || null;
  mapPosition(person, profile);
  for (const email of person.emailAddresses ?? []) {
    if (email.value?.trim()) profile.emails.push({ value: email.value.trim(), label: methodLabel(email), note: null });
  }
  for (const phone of person.phoneNumbers ?? []) {
    if (phone.value?.trim()) profile.phones.push({ value: phone.value.trim(), label: methodLabel(phone), note: null });
  }
  for (const url of person.urls ?? []) {
    if (url.value?.trim()) profile.links.push({ value: url.value.trim(), label: methodLabel(url), note: null });
  }
  mapAddresses(person, profile);
  const birthday = person.birthdays?.[0] ? birthdayValue(person.birthdays[0]) : null;
  if (birthday) profile.importantDates.push({ label: "Birthday", value: birthday, note: null });
  const note = person.biographies?.[0]?.value?.trim();
  const receipt = `Imported from Google Contacts${note ? `\nNote: ${note}` : ""}`.slice(0, 2000);
  return { contact: profile, receipt };
}

export class GoogleContactsProvider implements ContactsProvider {
  readonly id = "google" as const;
  readonly scope = "https://www.googleapis.com/auth/contacts.readonly";

  async fetchContacts(accessToken: string): Promise<ImportCandidate[]> {
    const candidates: ImportCandidate[] = [];
    let pageToken: string | undefined;
    do {
      const url = new URL(CONNECTIONS_URL);
      url.searchParams.set("personFields", PERSON_FIELDS);
      url.searchParams.set("pageSize", PAGE_SIZE);
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!response.ok) {
        throw new Error(`Google People API error ${response.status}: ${await response.text()}`);
      }
      const data = (await response.json()) as GoogleConnectionsResponse;
      for (const person of data.connections ?? []) {
        const candidate = googlePersonToCandidate(person);
        if (candidate) candidates.push(candidate);
        if (candidates.length >= MAX_CONTACTS) return candidates;
      }
      pageToken = data.nextPageToken;
    } while (pageToken);
    return candidates;
  }
}
