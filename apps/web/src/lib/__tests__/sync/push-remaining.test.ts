import { describe, expect, it } from "vitest";
import { offerUnlinkedCreates } from "@/lib/repo/sync/sweep";
import { SYNC_MAX_CREATES } from "@/utils/constants/sync";
import type { LocalContact } from "@/lib/repo/sync/read";

/**
 * What one run leaves behind, and whether the number it reports is one the user
 * can act on.
 *
 * A run offers at most SYNC_MAX_CREATES creates because the client applies them
 * one at a time. The remainder exists so a first sync of a large graph cannot
 * look finished while hundreds of people are still missing from the phone — but
 * it is only worth showing if syncing again actually drains it. A count that
 * includes rows this direction will NEVER offer (inferred stubs, imported rows,
 * people already on the device) is worse than silence: it tells the user to
 * repeat an action that cannot finish.
 */

function local(id: string, over: { source?: string; name?: string } = {}): LocalContact {
  return {
    id,
    source: over.source ?? "manual",
    contact: {
      name: over.name ?? `Person ${id}`,
      nickname: null,
      title: null,
      company: null,
      emails: [],
      phones: [],
      links: [],
      addresses: [],
      importantDates: [],
    },
  };
}

function many(
  count: number,
  prefix: string,
  over: { source?: string; name?: string } = {},
): LocalContact[] {
  return Array.from({ length: count }, (_, index) => local(`${prefix}-${index}`, over));
}

describe("offerUnlinkedCreates remainder", () => {
  it("reports nothing outstanding when the run offered everyone it could", () => {
    const offer = offerUnlinkedCreates(many(3, "authored"), new Set());

    expect(offer.writes).toHaveLength(3);
    // Nothing was held back, so there is nothing to tell the user about — a
    // "sync again" prompt on a run that finished is a lie the UI would repeat
    // for ever.
    expect(offer.remaining).toBe(0);
  });

  it("stops at the ceiling and reports exactly what the ceiling held back", () => {
    const offer = offerUnlinkedCreates(many(SYNC_MAX_CREATES + 37, "authored"), new Set());

    expect(offer.writes).toHaveLength(SYNC_MAX_CREATES);
    // The promise the copy makes: run it again and these 37 arrive.
    expect(offer.remaining).toBe(37);
  });

  it("counts only the contacts a later run could actually drain", () => {
    // The graph the bug lives in: far more ineligible rows than the ceiling, so
    // any count derived from "rows we did not reach" is dominated by contacts
    // this direction refuses to push on purpose.
    const drainable = many(SYNC_MAX_CREATES + 12, "authored");
    const alreadyOnTheDevice = many(300, "linked");
    const neverOffered = [
      // AI-inferred stubs lifted out of notes.
      ...many(400, "stub", { source: "mentioned" }),
      // Rows that arrived from a CSV/vCard or another account.
      ...many(400, "csv", { source: "import" }),
      // Nameless rows are not contacts, they are blanks.
      ...many(50, "blank", { name: "" }),
    ];
    const rows = [...neverOffered, ...alreadyOnTheDevice, ...drainable];

    const offer = offerUnlinkedCreates(
      rows,
      new Set(alreadyOnTheDevice.map((row) => row.id)),
    );

    expect(offer.writes).toHaveLength(SYNC_MAX_CREATES);
    // THE assertion. `local.length - writes.length` — the shape anyone
    // "simplifying" this reaches for first, and the only one the old mid-loop
    // `break` could have supported — reports 1162 here. The user would sync
    // again, drain 12, and be told 1150 are still waiting, for ever.
    expect(rows.length - offer.writes.length).toBeGreaterThan(offer.remaining);
    expect(offer.remaining).toBe(12);

    // And the rows that inflate the naive count are genuinely never offered, so
    // counting them could never have been right.
    const offered = new Set(offer.writes.map((write) => write.contactId));
    expect([...neverOffered, ...alreadyOnTheDevice].some((row) => offered.has(row.id))).toBe(
      false,
    );
  });

  it("has nothing to report when every unlinked row is one it refuses to push", () => {
    // Well past the ceiling, and not one of them drainable: the honest answer is
    // silence, not a backlog the user cannot clear.
    const offer = offerUnlinkedCreates(
      many(SYNC_MAX_CREATES + 200, "stub", { source: "mentioned" }),
      new Set(),
    );

    expect(offer.writes).toHaveLength(0);
    expect(offer.remaining).toBe(0);
  });
});
