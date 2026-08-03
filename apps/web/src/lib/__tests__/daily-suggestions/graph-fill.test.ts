import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { getDb } from "@/lib/db/request-scope";
import { edges } from "@/lib/db/schema";
import { buildDailySuggestions } from "@/lib/repo/daily-suggestions";
import { newContact, utcPrefs } from "./helpers";

/**
 * The fifth candidate source: structure alone, no event behind it. This file
 * exists so the "nothing is due anywhere" case can be stated as a fact about the
 * database rather than as an ordering assumption — it sets no cadence, no
 * follow-up, no date and no signal, and its own PGlite guarantees no sibling
 * spec can put one there.
 */
describe("daily suggestions — graph fill", () => {
  it("fills a leftover slot purely by graph traversal when nothing is due", async () => {
    const hub = await newContact("Hub");
    const spoke = await newContact("Spoke");
    const db = await getDb();
    await db.insert(edges).values({
      id: randomUUID(),
      srcType: "contact",
      srcId: hub,
      predicate: "knows",
      dstType: "contact",
      dstId: spoke,
      sourceNoteId: null,
      createdAt: new Date(),
    });

    // WHY: with nothing due, degree centrality is the only defensible reason
    // left to name anyone — and Home must never render an empty Today. The
    // bucket is asserted alongside the id because a row that appeared for a
    // different reason would mean some other term scored on a contact that has
    // no event attached to it at all.
    const { suggestions } = await buildDailySuggestions({ count: 3, prefs: utcPrefs, busy: [] });
    expect(suggestions.some((item) => item.bucket === "graph" && item.contactId === hub)).toBe(true);
  });
});
