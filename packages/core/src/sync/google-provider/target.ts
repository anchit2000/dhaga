import { personToSyncable, READ_PERSON_FIELDS, syncableToPerson, updateMaskFor } from "./map";
import type { ContactSyncTarget, ExternalContact, ExternalRef, SyncableContact, SyncContainer } from "../types";
import type { GoogleConnectionsResponse, GooglePerson } from "./api-types";

/**
 * ContactSyncTarget over the Google People API.
 *
 * Token-bound: one instance serves one connected account, which is why the
 * provider mints it per connection rather than registering a singleton. The
 * target itself stays a plain ContactSyncTarget, so reconcileContacts cannot
 * tell it apart from the mobile device target.
 */

const PEOPLE_BASE = "https://people.googleapis.com/v1";
const PAGE_SIZE = 1000;
/** Google's own ceiling is 2000 pages; this is a runaway guard, not a policy. */
const MAX_PAGES = 50;

async function callPeople<T>(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${PEOPLE_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    // The body can carry the user's contact data, so only the status is
    // surfaced — an error string here would end up in server logs, and
    // third-party PII must never be logged in plaintext.
    throw new Error(`Google People ${init.method ?? "GET"} ${path} failed (HTTP ${response.status})`);
  }
  return (await response.json()) as T;
}

function toExternal(person: GooglePerson): ExternalContact | null {
  if (!person.resourceName) return null;
  return {
    ...personToSyncable(person),
    externalId: person.resourceName,
    containerId: null,
    etag: person.etag ?? null,
  };
}

export function createGoogleContactTarget(params: { accessToken: string }): ContactSyncTarget {
  const { accessToken } = params;

  return {
    id: "google",

    /**
     * Google has no container concept for a personal account — "my contacts" is
     * the whole address book — so one synthetic container is reported. It
     * syncsRemotely by definition: unlike the Android device target, a write
     * here IS the remote account, which is the entire reason this provider
     * exists.
     */
    async listContainers(): Promise<SyncContainer[]> {
      return [{ id: "google:me", name: "Google Contacts", type: "google", syncsRemotely: true }];
    },

    /**
     * `since` is ignored: People's incremental mode needs a syncToken from the
     * previous run, not a timestamp, and this contract has nowhere to persist
     * one. A full enumeration is correct — just more requests — and it is what
     * lets the reconcile authorise its deletion sweep, which a partial list
     * could not.
     */
    async listChanged(): Promise<ExternalContact[]> {
      const contacts: ExternalContact[] = [];
      let pageToken: string | undefined;
      for (let page = 0; page < MAX_PAGES; page += 1) {
        const query = new URLSearchParams({
          personFields: READ_PERSON_FIELDS,
          pageSize: String(PAGE_SIZE),
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
        if (!pageToken) return contacts;
      }
      // Ran out of pages before Google ran out of contacts. Throwing beats
      // returning a truncated list, which the reconcile would read as "every
      // contact past this point was deleted".
      throw new Error(`Google People returned more than ${MAX_PAGES * PAGE_SIZE} contacts`);
    },

    async create(contact: SyncableContact): Promise<ExternalRef> {
      const created = await callPeople<GooglePerson>(accessToken, "/people:createContact", {
        method: "POST",
        body: JSON.stringify(syncableToPerson(contact)),
      });
      if (!created.resourceName) {
        throw new Error("Google People createContact returned no resourceName");
      }
      return { externalId: created.resourceName, etag: created.etag ?? null };
    },

    /**
     * `etag` is REQUIRED by updateContact — it is Google's optimistic-concurrency
     * check, and a stale one is rejected rather than silently overwriting a
     * change made in Google Contacts since we last read it. The mask covers
     * exactly the supplied fields (see ./map/to-person.ts): anything wider would
     * clear collections Dhaga does not manage.
     */
    async patch(
      externalId: string,
      fields: Partial<SyncableContact>,
      etag: string | null,
    ): Promise<ExternalRef> {
      const mask = updateMaskFor(fields);
      if (!mask) return { externalId, etag };
      const query = new URLSearchParams({ updatePersonFields: mask });
      const updated = await callPeople<GooglePerson>(
        accessToken,
        `/${externalId}:updateContact?${query.toString()}`,
        {
          method: "PATCH",
          body: JSON.stringify({ ...syncableToPerson(fields), etag: etag ?? undefined }),
        },
      );
      return { externalId: updated.resourceName ?? externalId, etag: updated.etag ?? null };
    },
  };
}
