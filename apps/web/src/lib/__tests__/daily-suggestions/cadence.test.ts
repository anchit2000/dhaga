import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { getDb } from "@/lib/db/request-scope";
import { contacts, edges, eventContacts, events } from "@/lib/db/schema";
import { buildDailySuggestions } from "@/lib/repo/daily-suggestions";
import { addNote, deleteNote } from "@/lib/repo/notes";
import { has, makeDue, newContact, rankOf, utcPrefs } from "./helpers";

/**
 * What "due" means. The cadence a user sets is the one promise Dhaga makes on
 * their behalf, so these specs pin both halves of it: who lands on the list, and
 * — more easily broken — who comes back OFF it. Every case is scoped to the ids
 * it creates, so the file is order-independent.
 */
const big = { count: 25, prefs: utcPrefs, busy: [] };

describe("daily suggestions — cadence", () => {
  it("pins an overdue daily-cadence contact as a check-in, ahead of graph fill", async () => {
    const id = await newContact("Daily");
    await makeDue(id, 1, 3);
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

    // WHY: a cadence is asserted by the user; degree is inferred by us. If a
    // graph filler could outrank a promise the user made, Today would quietly
    // become a popularity list. The bucket is asserted too — an overdue daily
    // cadence has to read as "Daily check-in", not as its next-best term.
    const { suggestions } = await buildDailySuggestions(big);
    expect(suggestions.find((item) => item.contactId === id)?.bucket).toBe("daily");
    expect(rankOf(suggestions, hub)).toBeGreaterThan(rankOf(suggestions, id));
  });

  it("never exceeds the configured count even when more are due", async () => {
    const mine = new Set<string>();
    for (let i = 0; i < 8; i++) {
      const id = await newContact(`Cap ${i}`);
      // 400 days overdue on a daily cadence: the loudest thing this file can
      // produce, so the cap is measured against candidates that certainly win.
      await makeDue(id, 1, 400);
      mine.add(id);
    }

    // WHY: `toBeLessThanOrEqual(5)` alone passes when NOTHING is due — it cannot
    // fail if the due query breaks. The count must be exact, and the rows must
    // be the eight this test made due, or the assertion is about someone else.
    const { suggestions } = await buildDailySuggestions({ count: 5, prefs: utcPrefs, busy: [] });
    expect(suggestions).toHaveLength(5);
    expect(suggestions.every((item) => mine.has(item.contactId))).toBe(true);
  });

  it("a note added today takes a weekly-cadence contact off the list", async () => {
    const id = await newContact("Weekly Waseem");
    await makeDue(id, 7, 10);
    expect(has((await buildDailySuggestions(big)).suggestions, id)).toBe(true);

    await addNote(id, "text", "long call about their move to Berlin");

    // WHY: the promise is "contact them every 7 days", and a note IS contact.
    // Nagging someone right after a real interaction is how a reminder list
    // teaches its user to ignore it. This fails against the old
    // COALESCE(lastReachedOutAt, createdAt) definition, which never read notes.
    expect(has((await buildDailySuggestions(big)).suggestions, id)).toBe(false);
  });

  it("an event scan resets the cadence clock too", async () => {
    const id = await newContact("Scanned Sana");
    await makeDue(id, 7, 10);
    expect(has((await buildDailySuggestions(big)).suggestions, id)).toBe(true);

    const db = await getDb();
    const eventId = randomUUID();
    await db.insert(events).values({ id: eventId, name: `Web Summit ${eventId}`, tags: [] });
    await db.insert(eventContacts).values({ eventId, contactId: id });

    // WHY: last-touch.ts names four touch signals (capture, reach-out, note,
    // event scan). The due query must honour all four or Today contradicts
    // Recent People and the relationship strength score on the same screen.
    expect(has((await buildDailySuggestions(big)).suggestions, id)).toBe(false);
  });

  it("a soft-deleted note does not reset the clock", async () => {
    const id = await newContact("Tombstone Tanvi");
    await makeDue(id, 7, 10);
    const noteId = await addNote(id, "text", "met at the meetup");
    expect(has((await buildDailySuggestions(big)).suggestions, id)).toBe(false);

    await deleteNote(noteId);

    // WHY: a tombstoned note's content is gone from the product, so the
    // interaction it recorded must stop counting — otherwise deleting a note
    // silently keeps someone suppressed from their own cadence forever.
    expect(has((await buildDailySuggestions(big)).suggestions, id)).toBe(true);
  });

  it("a source='mentioned' stub with a cadence never appears", async () => {
    const id = await newContact("Stub Sohan");
    await makeDue(id, 7, 10);
    const db = await getDb();
    await db.update(contacts).set({ source: "mentioned" }).where(eq(contacts.id, id));

    // WHY: "Prashant's son" is a name extraction found in a note, not a person
    // you can message. A stub carrying a cadence is exactly the case where the
    // exclusion has to hold in the due query AND in the candidate-facts join —
    // either one forgetting it puts an unreachable row on Home.
    expect(has((await buildDailySuggestions(big)).suggestions, id)).toBe(false);
  });
});
