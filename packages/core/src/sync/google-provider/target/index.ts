import { callPeople } from "../http";
import { syncableToPerson, updateMaskFor } from "../map";
import { listAllPeople, listChangedPeople } from "./list";
import type {
  ChangedContactsPage,
  ContactSyncTarget,
  ExternalContact,
  ExternalRef,
  SyncableContact,
  SyncContainer,
} from "../../types";
import type { GooglePerson } from "../api-types";

/**
 * ContactSyncTarget over the Google People API.
 *
 * Token-bound: one instance serves one connected account, which is why the
 * provider mints it per connection rather than registering a singleton. The
 * target itself stays a plain ContactSyncTarget, so reconcileContacts cannot
 * tell it apart from the mobile device target.
 */
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
     * `since` is ignored: People has no modified-since query. Incremental sync
     * runs off a syncToken instead, which is `listChangedSince` below — this
     * method remains the honest whole-address-book answer callers can always
     * fall back to, and the one that can authorise a deletion sweep.
     */
    async listChanged(): Promise<ExternalContact[]> {
      return listAllPeople(accessToken);
    },

    async listChangedSince(cursor: string | null): Promise<ChangedContactsPage> {
      return listChangedPeople(accessToken, cursor);
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
     * exactly the supplied fields (see ../map/to-person.ts): anything wider would
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
