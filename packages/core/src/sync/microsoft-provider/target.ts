import { graphToSyncable, MICROSOFT_UNSUPPORTED_FIELDS, syncableToGraph } from "./map";
import type {
  ContactSyncTarget,
  ExternalContact,
  ExternalRef,
  SyncableContact,
  SyncContainer,
} from "../types";
import type { GraphContact, GraphContactsResponse } from "./api-types";

/** ContactSyncTarget over Microsoft Graph's /me/contacts. */

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
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

async function callGraph<T>(
  accessToken: string,
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(url.startsWith("http") ? url : `${GRAPH_BASE}${url}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    // Status only: the body can carry the user's contact data, and third-party
    // PII must never reach a plaintext server log.
    throw new Error(`Microsoft Graph ${init.method ?? "GET"} failed (HTTP ${response.status})`);
  }
  // DELETE and some PATCHes answer 204 with no body.
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

function toExternal(contact: GraphContact): ExternalContact | null {
  if (!contact.id) return null;
  return {
    ...graphToSyncable(contact),
    externalId: contact.id,
    containerId: null,
    etag: contact["@odata.etag"] ?? null,
  };
}

export function createMicrosoftContactTarget(params: { accessToken: string }): ContactSyncTarget {
  const { accessToken } = params;

  return {
    id: "microsoft",

    /** Graph's fixed model cannot hold these — see ./map.ts. */
    unsupportedFields: MICROSOFT_UNSUPPORTED_FIELDS,

    async listContainers(): Promise<SyncContainer[]> {
      return [
        { id: "microsoft:me", name: "Outlook Contacts", type: "microsoft", syncsRemotely: true },
      ];
    },

    /** `since` is ignored: Graph's delta endpoint needs a stored deltaLink, not a
     *  timestamp, and a full enumeration is what authorises the deletion sweep. */
    async listChanged(): Promise<ExternalContact[]> {
      const contacts: ExternalContact[] = [];
      let url = `/me/contacts?$select=${SELECT}&$top=${PAGE_SIZE}`;
      for (let page = 0; page < MAX_PAGES; page += 1) {
        const body = await callGraph<GraphContactsResponse>(accessToken, url);
        for (const contact of body.value ?? []) {
          const external = toExternal(contact);
          if (external) contacts.push(external);
        }
        const next = body["@odata.nextLink"];
        if (!next) return contacts;
        url = next;
      }
      // Truncating would read downstream as "everything after this was deleted".
      throw new Error(`Microsoft Graph returned more than ${MAX_PAGES * PAGE_SIZE} contacts`);
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
