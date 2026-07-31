import { callGraph } from "../http";
import { MICROSOFT_UNSUPPORTED_FIELDS, syncableToGraph } from "../map";
import { listAllContacts, listChangedContacts } from "./list";
import type {
  ChangedContactsPage,
  ContactSyncTarget,
  ExternalContact,
  ExternalRef,
  SyncableContact,
  SyncContainer,
} from "../../types";
import type { GraphContact } from "../api-types";

/** ContactSyncTarget over Microsoft Graph's /me/contacts. */
export function createMicrosoftContactTarget(params: { accessToken: string }): ContactSyncTarget {
  const { accessToken } = params;

  return {
    id: "microsoft",

    /** Graph's fixed model cannot hold these — see ../map.ts. */
    unsupportedFields: MICROSOFT_UNSUPPORTED_FIELDS,

    async listContainers(): Promise<SyncContainer[]> {
      return [
        { id: "microsoft:me", name: "Outlook Contacts", type: "microsoft", syncsRemotely: true },
      ];
    },

    /**
     * `since` is ignored: Graph has no modified-since query on contacts.
     * Incremental sync runs off a deltaLink instead, which is
     * `listChangedSince` below — this method remains the honest
     * whole-address-book answer, and the one that can authorise a sweep.
     */
    async listChanged(): Promise<ExternalContact[]> {
      return listAllContacts(accessToken);
    },

    async listChangedSince(cursor: string | null): Promise<ChangedContactsPage> {
      return listChangedContacts(accessToken, cursor);
    },

    async create(contact: SyncableContact): Promise<ExternalRef> {
      const created = await callGraph<GraphContact>(accessToken, "/me/contacts", {
        method: "POST",
        body: JSON.stringify(syncableToGraph(contact)),
      });
      if (!created?.id) throw new Error("Microsoft Graph create returned no id");
      return { externalId: created.id, etag: created["@odata.etag"] ?? null };
    },

    /**
     * Graph PATCH is already a partial update — only the properties present in
     * the body are written — which is exactly ContactSyncTarget.patch's
     * contract, so no field mask is needed. `If-Match` carries the etag so a
     * record changed in Outlook since we read it is rejected rather than
     * overwritten; `*` when we have none, which is Graph's "I accept whatever
     * is current".
     */
    async patch(
      externalId: string,
      fields: Partial<SyncableContact>,
      etag: string | null,
    ): Promise<ExternalRef> {
      const body = syncableToGraph(fields);
      if (Object.keys(body).length === 0) return { externalId, etag };
      const updated = await callGraph<GraphContact>(accessToken, `/me/contacts/${externalId}`, {
        method: "PATCH",
        headers: { "If-Match": etag ?? "*" },
        body: JSON.stringify(body),
      });
      return {
        externalId: updated?.id ?? externalId,
        etag: updated?.["@odata.etag"] ?? null,
      };
    },
  };
}
