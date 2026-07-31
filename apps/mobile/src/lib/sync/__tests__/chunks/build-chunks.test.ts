import { describe, expect, it } from "vitest";

import { SYNC_MAX_CONTACTS } from "@/utils/constants/sync";

import { chunksOf, observed } from "./helpers";

describe("buildPushChunks", () => {
  it("reports an emptied address book instead of staying silent", () => {
    // Sending nothing left the user's links claiming to be synced against
    // records they had deleted — the one change sync could not see. The claim
    // has to be explicit: `contacts: []` alone is also what a failed
    // enumeration looks like, and the server refuses to sweep on that.
    const chunks = chunksOf(0);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].contacts).toEqual([]);
    expect(chunks[0].observedEmpty).toBe(true);
    expect(chunks[0].full).toBe(false);
  });

  it("never claims emptiness when it observed contacts", () => {
    // The server only honours the flag on a genuinely empty batch, but a client
    // that sets both is confused about what it saw — don't be that client.
    expect(chunksOf(3).every((chunk) => chunk.observedEmpty === undefined)).toBe(true);
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
