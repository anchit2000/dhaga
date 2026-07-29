import { describe, expect, it } from "vitest";

import { SYNC_MAX_CONTACTS } from "@/utils/constants/sync";

import { buildPushChunks, mergePushResponses } from "../engine/chunks";

import type { ObservedContact, SyncPushResponse } from "@dhaga/core/src/api/sync";

/**
 * The boundary these tests defend is not cosmetic. `observedExternalIds` is
 * what authorises the server's deletion sweep, so putting it on anything but a
 * complete enumeration would tombstone every link absent from that chunk — the
 * user's address book, unlinked, silently. Getting the split wrong in the other
 * direction drops people from the sync entirely.
 */
function observed(count: number): ObservedContact[] {
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

function chunksOf(count: number): ReturnType<typeof buildPushChunks> {
  return buildPushChunks({ provider: "device", containerId: "container-1", contacts: observed(count) });
}

describe("buildPushChunks", () => {
  it("sends nothing at all for an empty address book", () => {
    // The push schema requires at least one contact, so there is no legal
    // request to make — and an empty batch is not evidence of anything either.
    expect(chunksOf(0)).toEqual([]);
  });

  it("keeps a book that fits in one request as one request", () => {
    expect(chunksOf(1)).toHaveLength(1);
    expect(chunksOf(SYNC_MAX_CONTACTS - 1)).toHaveLength(1);
    expect(chunksOf(SYNC_MAX_CONTACTS)).toHaveLength(1);
  });

  it("splits at exactly one over the server's ceiling, remainder last", () => {
    const chunks = chunksOf(SYNC_MAX_CONTACTS + 1);
    expect(chunks.map((chunk) => chunk.contacts.length)).toEqual([SYNC_MAX_CONTACTS, 1]);
  });

  it("partitions the book — every contact sent once, in read order", () => {
    const chunks = chunksOf(SYNC_MAX_CONTACTS * 2 + 7);
    expect(chunks.map((chunk) => chunk.contacts.length)).toEqual([
      SYNC_MAX_CONTACTS,
      SYNC_MAX_CONTACTS,
      7,
    ]);
    const sent = chunks.flatMap((chunk) => chunk.contacts.map((contact) => contact.externalId));
    expect(sent).toEqual(observed(SYNC_MAX_CONTACTS * 2 + 7).map((contact) => contact.externalId));
    expect(new Set(sent).size).toBe(sent.length);
  });

  it("never claims a chunk is the complete address book", () => {
    // `full` would have the server read every id absent from THIS chunk as a
    // deletion — the 1000-contact bug turned into data loss.
    expect(chunksOf(SYNC_MAX_CONTACTS * 3).every((chunk) => chunk.full === false)).toBe(true);
  });

  it("puts the container's whole id set on the last chunk and nowhere else", () => {
    const chunks = chunksOf(SYNC_MAX_CONTACTS + 1);
    expect(chunks[0].observedExternalIds).toBeNull();
    expect(chunks[1].observedExternalIds).toHaveLength(SYNC_MAX_CONTACTS + 1);
    // ALL the ids, not just the last chunk's: the sweep keeps every link whose
    // record was seen anywhere in the run.
    expect(chunks[1].observedExternalIds).toContain("ext-0");
    expect(chunks[1].observedExternalIds).toContain(`ext-${SYNC_MAX_CONTACTS}`);
  });

  it("still authorises the sweep when the whole book fits in one chunk", () => {
    const [only] = chunksOf(3);
    expect(only.observedExternalIds).toEqual(["ext-0", "ext-1", "ext-2"]);
  });

  it("carries the caller's provider and container onto every chunk", () => {
    // A batch scoped to the wrong container would sweep the wrong account.
    const chunks = chunksOf(SYNC_MAX_CONTACTS + 1);
    expect(chunks.every((chunk) => chunk.provider === "device")).toBe(true);
    expect(chunks.every((chunk) => chunk.containerId === "container-1")).toBe(true);
  });
});

function response(over: Partial<SyncPushResponse>): SyncPushResponse {
  return { writes: [], conflicts: [], pulled: 0, created: 0, linked: 0, ...over };
}

describe("mergePushResponses", () => {
  it("reports a run that sent nothing as a run that did nothing", () => {
    expect(mergePushResponses([])).toEqual(response({}));
  });

  it("adds the counters and concatenates the work across chunks", () => {
    // Each chunk answers only for the contacts it carried, so the run's totals
    // exist nowhere but here — dropping a chunk's counts would under-report the
    // sync to the user, and dropping its writes would silently skip contacts.
    const merged = mergePushResponses([
      response({
        writes: [{ externalId: "ext-1", contactId: "c1", fields: { name: "A" }, etag: null }],
        pulled: 2,
        created: 1,
        linked: 3,
      }),
      response({
        writes: [{ externalId: null, contactId: "c2", fields: { name: "B" }, etag: null }],
        conflicts: [
          {
            contactId: "c3",
            contactName: "C",
            conflicts: [{ field: "name", kind: "both_edited", local: "C", remote: "C." }],
          },
        ],
        pulled: 5,
        created: 4,
        linked: 6,
      }),
    ]);

    expect(merged.writes.map((write) => write.contactId)).toEqual(["c1", "c2"]);
    expect(merged.conflicts).toHaveLength(1);
    expect(merged.pulled).toBe(7);
    expect(merged.created).toBe(5);
    expect(merged.linked).toBe(9);
  });
});
