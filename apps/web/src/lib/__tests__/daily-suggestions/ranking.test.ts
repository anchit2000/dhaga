import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { MIN_SUGGESTIONS_ON_BUSY_DAY } from "@/utils/constants/suggestions";
import { getDb } from "@/lib/db/request-scope";
import { followUps } from "@/lib/db/schema";
import { buildDailySuggestions } from "@/lib/repo/daily-suggestions";
import { makeDue, meetingsOn, newContact, rankOf, setBirthdayToday, utcPrefs } from "./helpers";

/**
 * The point of the rewrite: ONE additive score ranks every source against every
 * other, so ordering is a property of the evidence rather than of which bucket
 * happened to run first. Each case is scoped to the ids it creates and reads
 * ranks out of a long list, so it holds whatever else the file has written.
 */
describe("daily suggestions — ranking", () => {
  it("with count 1, the contact three cadence periods overdue is shown, not one that just came due", async () => {
    const veryLate = await newContact("Very Late Vikram");
    await makeDue(veryLate, 30, 120); // monthly, 90 days = 3 periods overdue
    const justDue: string[] = [];
    for (let i = 0; i < 3; i++) {
      const id = await newContact(`Just Due ${i}`);
      await makeDue(id, 30, 31); // monthly, one day past
      justDue.push(id);
    }

    // WHY: this is the whole point of the rewrite. Under the old FNV-hash
    // ordering, which of these four filled the single slot was a coin flip, so
    // the person most at risk of being forgotten was the least likely to show.
    const long = await buildDailySuggestions({ count: 25, prefs: utcPrefs, busy: [] });
    for (const id of justDue) {
      expect(rankOf(long.suggestions, veryLate)).toBeLessThan(rankOf(long.suggestions, id));
    }
    const one = await buildDailySuggestions({ count: 1, prefs: utcPrefs, busy: [] });
    expect(one.suggestions.some((item) => justDue.includes(item.contactId))).toBe(false);
  });

  it("a contact who is both cadence-due and has a birthday today outranks one who is only cadence-due", async () => {
    const now = new Date();
    const both = await newContact("Birthday Bina");
    await makeDue(both, 30, 31);
    await setBirthdayToday(both, now);
    const only = await newContact("Cadence Chirag");
    await makeDue(only, 30, 31);

    // WHY: the entire justification for an ADDITIVE score. The old sequential
    // buckets emitted both of these as identical "cadence" rows — a birthday
    // could add nothing, because the cadence bucket had already claimed them.
    const { suggestions } = await buildDailySuggestions({
      count: 25,
      prefs: utcPrefs,
      busy: [],
      date: now,
    });
    expect(rankOf(suggestions, both)).toBeLessThan(rankOf(suggestions, only));
    // And the extra evidence, being the larger term, must also name the row.
    expect(suggestions.find((item) => item.contactId === both)?.bucket).toBe("date");
    expect(suggestions.find((item) => item.contactId === only)?.bucket).toBe("cadence");
  });

  it("a busy calendar shrinks the list but never empties it", async () => {
    const day = new Date();
    for (let i = 0; i < 3; i++) {
      await makeDue(await newContact(`Busy Day ${i}`), 30, 120);
    }
    const options = { count: 3, prefs: utcPrefs, date: day };

    // WHY: capacity is `count - meetingCount`, which goes negative on a heavy
    // day. Flooring it at MIN_SUGGESTIONS_ON_BUSY_DAY is what stops a full
    // calendar from silencing Today altogether, and a floor with no test is a
    // floor someone deletes while "simplifying" the arithmetic.
    const free = await buildDailySuggestions({ ...options, busy: [] });
    expect(free.suggestions).toHaveLength(3);
    const packed = await buildDailySuggestions({ ...options, busy: meetingsOn(day, 5) });
    expect(packed.suggestions).toHaveLength(MIN_SUGGESTIONS_ON_BUSY_DAY);
    expect(packed.suggestions.length).toBeGreaterThan(0);
  });

  it("the same person never appears twice when they hit three sources at once", async () => {
    const now = new Date();
    const id = await newContact("Triple Tara");
    await makeDue(id, 30, 120);
    await setBirthdayToday(id, now);
    const db = await getDb();
    await db.insert(followUps).values({
      id: randomUUID(),
      contactId: id,
      action: "send the deck",
      dueHint: null,
      dueDate: now,
      status: "open",
      sourceNoteId: null,
    });

    // WHY: the sources are gathered into a union keyed by contact, not
    // concatenated. Without the dedupe, the person you owe the most would eat
    // three of five slots and push three other people off the list entirely.
    const { suggestions } = await buildDailySuggestions({
      count: 25,
      prefs: utcPrefs,
      busy: [],
      date: now,
    });
    expect(suggestions.filter((item) => item.contactId === id)).toHaveLength(1);
  });
});
