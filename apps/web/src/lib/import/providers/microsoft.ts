/**
 * Microsoft Graph contacts provider (Outlook / Hotmail). The network fetch is
 * thin — all field mapping lives in the exported pure
 * {@link graphContactToCandidate} so it is unit-testable without the network.
 * Mirrors the vCard mapper's ContactProfile style. SERVER-ONLY.
 */
import { emptyContactProfile } from "@dhaga/core";
import type { ContactProfile } from "@dhaga/core";
import type { ImportCandidate } from "../types";
import type { ContactsProvider } from "./types";

const CONTACTS_URL = "https://graph.microsoft.com/v1.0/me/contacts?$top=100";
/** Hard cap so a pathological account can never exhaust memory (Rule 12). */
const MAX_CONTACTS = 25_000;

interface GraphEmail { address?: string; name?: string }
interface GraphAddress { street?: string; city?: string; state?: string; postalCode?: string; countryOrRegion?: string }
export interface GraphContact {
  displayName?: string;
  givenName?: string;
  surname?: string;
  nickName?: string;
  emailAddresses?: GraphEmail[];
  homePhones?: string[];
  businessPhones?: string[];
  mobilePhone?: string | null;
  companyName?: string;
  jobTitle?: string;
  department?: string;
  homeAddress?: GraphAddress;
  businessAddress?: GraphAddress;
  personalNotes?: string;
  birthday?: string | null;
}
interface GraphContactsResponse {
  value?: GraphContact[];
  "@odata.nextLink"?: string;
}

function deriveName(contact: GraphContact): string {
  const display = contact.displayName?.trim();
  if (display) return display;
  return [contact.givenName?.trim(), contact.surname?.trim()].filter(Boolean).join(" ");
}

function mapPosition(contact: GraphContact, profile: ContactProfile): void {
  const title = contact.jobTitle?.trim() || null;
  const company = contact.companyName?.trim() || null;
  const department = contact.department?.trim() || null;
  if (!title && !company && !department) return;
  profile.positions.push({
    title,
    company,
    department,
    current: true,
    startedAt: null,
    endedAt: null,
    note: null,
  });
}

function pushAddress(address: GraphAddress | undefined, label: string, profile: ContactProfile): void {
  if (!address) return;
  const parts = {
    street: address.street?.trim() || null,
    city: address.city?.trim() || null,
    region: address.state?.trim() || null,
    postalCode: address.postalCode?.trim() || null,
    country: address.countryOrRegion?.trim() || null,
  };
  if (!parts.street && !parts.city && !parts.region && !parts.postalCode && !parts.country) return;
  profile.addresses.push({ label, ...parts, note: null });
}

/** Map one Graph `contact` to a review candidate, or null if it has no name. */
export function graphContactToCandidate(contact: GraphContact): ImportCandidate | null {
  const name = deriveName(contact);
  if (!name) return null;
  const profile = emptyContactProfile();
  profile.name = name;
  profile.nickname = contact.nickName?.trim() || null;
  mapPosition(contact, profile);
  for (const email of contact.emailAddresses ?? []) {
    if (email.address?.trim()) profile.emails.push({ value: email.address.trim(), label: null, note: null });
  }
  for (const phone of contact.homePhones ?? []) {
    if (phone.trim()) profile.phones.push({ value: phone.trim(), label: "Home", note: null });
  }
  for (const phone of contact.businessPhones ?? []) {
    if (phone.trim()) profile.phones.push({ value: phone.trim(), label: "Work", note: null });
  }
  if (contact.mobilePhone?.trim()) {
    profile.phones.push({ value: contact.mobilePhone.trim(), label: "Mobile", note: null });
  }
  pushAddress(contact.homeAddress, "Home", profile);
  pushAddress(contact.businessAddress, "Work", profile);
  const first = profile.addresses[0];
  profile.location = first ? first.city ?? first.country : null;
  const birthday = contact.birthday?.trim();
  if (birthday && !birthday.startsWith("0001")) {
    profile.importantDates.push({ label: "Birthday", value: birthday.split("T")[0], note: null });
  }
  const note = contact.personalNotes?.trim();
  const receipt = `Imported from Outlook / Hotmail contacts${note ? `\nNote: ${note}` : ""}`.slice(0, 2000);
  return { contact: profile, receipt };
}

export class MicrosoftContactsProvider implements ContactsProvider {
  readonly id = "microsoft" as const;
  readonly scope = "Contacts.Read";

  async fetchContacts(accessToken: string): Promise<ImportCandidate[]> {
    const candidates: ImportCandidate[] = [];
    let next: string | undefined = CONTACTS_URL;
    while (next) {
      const response: Response = await fetch(next, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        throw new Error(`Microsoft Graph API error ${response.status}: ${await response.text()}`);
      }
      const data = (await response.json()) as GraphContactsResponse;
      for (const contact of data.value ?? []) {
        const candidate = graphContactToCandidate(contact);
        if (candidate) candidates.push(candidate);
        if (candidates.length >= MAX_CONTACTS) return candidates;
      }
      next = data["@odata.nextLink"];
    }
    return candidates;
  }
}
