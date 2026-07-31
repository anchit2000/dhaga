import { buildPushChunks } from "../../engine/chunks";

import type { ObservedContact, SyncPushResponse } from "@dhaga/core/src/api/sync";

/**
 * The boundary these tests defend is not cosmetic. `observedExternalIds` is
 * what authorises the server's deletion sweep, so putting it on anything but a
 * complete enumeration would tombstone every link absent from that chunk — the
 * user's address book, unlinked, silently. Getting the split wrong in the other
 * direction drops people from the sync entirely.
 */
export function observed(count: number): ObservedContact[] {
  return Array.from({ length: count }, (_unused, index) => ({
    externalId: `ext-${index}`,
    etag: null,
    name: `Person ${index}`,
    nickname: null,
    title: null,
    company: null,
    emails: [],
    phones: [],
    links: [],
    addresses: [],
    importantDates: [],
  }));
}

export function chunksOf(count: number): ReturnType<typeof buildPushChunks> {
  return buildPushChunks({ provider: "device", containerId: "container-1", contacts: observed(count) });
}

export function response(over: Partial<SyncPushResponse>): SyncPushResponse {
  return { writes: [], conflicts: [], pulled: 0, created: 0, linked: 0, remaining: 0, ...over };
}
