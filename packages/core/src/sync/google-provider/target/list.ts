import { isCursorExpired } from "../../http";
import { callPeople } from "../http";
import { personToSyncable, READ_PERSON_FIELDS } from "../map";
import type { ChangedContactsPage, ExternalContact } from "../../types";
import type { GoogleConnectionsResponse, GooglePerson } from "../api-types";

/**
 * Reading the Google address book, in full or incrementally.
 *
 * Both directions are the SAME endpoint and the same page loop — People's
 * incremental mode is just `connections.list` with a syncToken — so there is
 * one enumerator and the only variable is whether a token goes in.
 */

const PAGE_SIZE = 1000;
/** Google's own ceiling is 2000 pages; this is a runaway guard, not a policy. */
const MAX_PAGES = 50;

function toExternal(person: GooglePerson): ExternalContact | null {
  if (!person.resourceName) return null;
  // A person deleted since the syncToken was minted comes back as a bare
  // resourceName with metadata.deleted and NO field data. Passing that on would
  // hand the merge a contact whose every field is empty, and the merge — which
  // has a base snapshot saying those fields were once synced — would honour the
  // emptiness as the user deleting their own name, emails and phones. Dropping
  // it costs nothing: real deletions are detected by the sweep on a full run.
  if (person.metadata?.deleted) return null;
  return {
    ...personToSyncable(person),
    externalId: person.resourceName,
    containerId: null,
    etag: person.etag ?? null,
  };
}

interface Enumeration {
  contacts: ExternalContact[];
  cursor: string | null;
}

/**
 * Page through `connections.list`. With `syncToken` this returns only what
 * changed; without it, the whole address book. Either way it asks for a fresh
 * token, because a run that forgets to mint one condemns the next run to
 * another full enumeration.
 */
async function enumerate(accessToken: string, syncToken: string | null): Promise<Enumeration> {
  const contacts: ExternalContact[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const query = new URLSearchParams({
      // Must match the request the token was minted from, or People rejects it.
      personFields: READ_PERSON_FIELDS,
      pageSize: String(PAGE_SIZE),
      requestSyncToken: "true",
      ...(syncToken ? { syncToken } : {}),
      ...(pageToken ? { pageToken } : {}),
    });
    const body = await callPeople<GoogleConnectionsResponse>(
      accessToken,
      `/people/me/connections?${query.toString()}`,
    );
    for (const person of body.connections ?? []) {
      const external = toExternal(person);
      if (external) contacts.push(external);
    }
    pageToken = body.nextPageToken;
    // nextSyncToken is only issued on the LAST page of a run.
    if (!pageToken) return { contacts, cursor: body.nextSyncToken ?? null };
  }

  // Ran out of pages before Google ran out of contacts. Throwing beats
  // returning a truncated list, which the reconcile would read as "every
  // contact past this point was deleted".
  throw new Error(`Google People returned more than ${MAX_PAGES * PAGE_SIZE} contacts`);
}

/** The complete address book, for the cursor-free `listChanged` contract. */
export async function listAllPeople(accessToken: string): Promise<ExternalContact[]> {
  return (await enumerate(accessToken, null)).contacts;
}

/**
 * Incremental when a cursor is held, full otherwise — and full again whenever
 * the cursor turns out to be dead.
 *
 * Google expires a syncToken after roughly a week, and answers a stale one with
 * 410 GONE telling the client to clear its cache and retry without it. That is
 * a recoverable condition, not a failed run: the fallback below re-enumerates
 * everything and returns a replacement cursor, and because the result is then
 * honestly labelled `"full"` it is also the run that gets to detect deletions.
 */
export async function listChangedPeople(
  accessToken: string,
  cursor: string | null,
): Promise<ChangedContactsPage> {
  if (cursor) {
    try {
      const incremental = await enumerate(accessToken, cursor);
      return { mode: "incremental", ...incremental };
    } catch (error) {
      if (!isCursorExpired(error)) throw error;
    }
  }
  const full = await enumerate(accessToken, null);
  return { mode: "full", ...full };
}
