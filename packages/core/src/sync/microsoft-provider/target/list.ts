import { isCursorExpired } from "../../http";
import { callGraph } from "../http";
import { graphToSyncable } from "../map";
import type { ChangedContactsPage, ExternalContact } from "../../types";
import type { GraphContact, GraphContactsResponse } from "../api-types";

/**
 * Reading the Outlook address book, in full or incrementally.
 *
 * Unlike Google, Graph splits the two across different endpoints: `/me/contacts`
 * lists, `/me/contacts/delta` lists AND issues the deltaLink that makes the next
 * run incremental. Both page identically via `@odata.nextLink`, so one loop
 * serves both and the only variable is the URL it starts from.
 */

const PAGE_SIZE = 100;
/** Runaway guard, not a policy — Graph pages indefinitely via @odata.nextLink. */
const MAX_PAGES = 200;

const SELECT = [
  "id",
  "displayName",
  "givenName",
  "surname",
  "nickName",
  "companyName",
  "jobTitle",
  "emailAddresses",
  "homePhones",
  "businessPhones",
  "mobilePhone",
].join(",");

/** Plain listing. `$top` is honoured here; delta sizes its own pages. */
const FULL_URL = `/me/contacts?$select=${SELECT}&$top=${PAGE_SIZE}`;
const DELTA_URL = `/me/contacts/delta?$select=${SELECT}`;

function toExternal(contact: GraphContact): ExternalContact | null {
  if (!contact.id) return null;
  // A delta page reports a deletion as `{ id, "@removed" }` with no properties.
  // Passing that on would hand the merge a contact whose every field is empty,
  // and the merge — holding a base snapshot saying those fields were once
  // synced — would honour the emptiness as the user clearing their own data.
  // Dropping it costs nothing: real deletions are caught by the sweep on a full
  // run.
  if (contact["@removed"]) return null;
  return {
    ...graphToSyncable(contact),
    externalId: contact.id,
    containerId: null,
    etag: contact["@odata.etag"] ?? null,
  };
}

interface Enumeration {
  contacts: ExternalContact[];
  cursor: string | null;
}

async function pageThrough(accessToken: string, startUrl: string): Promise<Enumeration> {
  const contacts: ExternalContact[] = [];
  let url = startUrl;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const body = await callGraph<GraphContactsResponse>(accessToken, url);
    for (const contact of body.value ?? []) {
      const external = toExternal(contact);
      if (external) contacts.push(external);
    }
    const next = body["@odata.nextLink"];
    // The deltaLink arrives only once paging is exhausted; a plain listing has
    // none, and null is the honest answer for it.
    if (!next) return { contacts, cursor: body["@odata.deltaLink"] ?? null };
    url = next;
  }

  // Truncating would read downstream as "everything after this was deleted".
  throw new Error(`Microsoft Graph returned more than ${MAX_PAGES * PAGE_SIZE} contacts`);
}

/** The complete address book, for the cursor-free `listChanged` contract. */
export async function listAllContacts(accessToken: string): Promise<ExternalContact[]> {
  return (await pageThrough(accessToken, FULL_URL)).contacts;
}

/**
 * Incremental when a cursor is held, full otherwise — and full again whenever
 * the cursor turns out to be dead.
 *
 * Graph invalidates a deltaLink (token aged out, mailbox moved) with 410 GONE
 * and a `resyncRequired` code, meaning "start over from a fresh delta". That is
 * a recoverable condition, not a failed run: the fallback below re-enumerates
 * from `/me/contacts/delta`, which both returns everything and issues a
 * replacement cursor — and because the result is then honestly labelled
 * `"full"`, it is also the run that gets to detect deletions.
 */
export async function listChangedContacts(
  accessToken: string,
  cursor: string | null,
): Promise<ChangedContactsPage> {
  if (cursor) {
    try {
      const incremental = await pageThrough(accessToken, cursor);
      return { mode: "incremental", ...incremental };
    } catch (error) {
      if (!isCursorExpired(error)) throw error;
    }
  }
  const full = await pageThrough(accessToken, DELTA_URL);
  return { mode: "full", ...full };
}
