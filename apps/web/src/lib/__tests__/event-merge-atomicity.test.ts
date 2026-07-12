import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { createContact } from "@/lib/repo/contacts";
import {
  addContactToEvent,
  createEvent,
  getEvent,
  listEventContacts,
  mergeEvents,
} from "@/lib/repo/events";

function person(name: string) {
  return {
    name,
    title: null,
    company: null,
    emails: [],
    phones: [],
    links: [],
    location: null,
  };
}

/**
 * mergeEvents copies every member of fromId into intoId, then deletes
 * fromId's own eventContacts rows and the fromId event row itself.
 * Union semantics: overlapping members (the same contact scanned into both
 * events) must collapse into one row in intoId, not duplicate, and
 * members unique to each event must all survive the merge.
 */
describe("mergeEvents happy path", () => {
  it("intoId ends up with the union of both events' contacts, fromId is gone", async () => {
    const fromId = await createEvent(`from-${randomUUID()}`);
    const intoId = await createEvent(`into-${randomUUID()}`);

    const shared = await createContact(person("Shared Contact"), "manual");
    const onlyFrom = await createContact(person("Only In From"), "manual");
    const onlyInto = await createContact(person("Only In Into"), "manual");

    await addContactToEvent(fromId, shared);
    await addContactToEvent(fromId, onlyFrom);
    await addContactToEvent(intoId, shared);
    await addContactToEvent(intoId, onlyInto);

    await mergeEvents(fromId, intoId);

    const intoMembers = (await listEventContacts(intoId)).map((m) => m.id).sort();
    expect(intoMembers).toEqual([onlyInto, onlyFrom, shared].sort());

    expect(await getEvent(fromId)).toBeNull();
    expect(await listEventContacts(fromId)).toHaveLength(0);
  });
});

/**
 * The merge is wrapped in one transaction specifically so a failure partway
 * through — after members have already been copied into intoId but before
 * fromId's own rows are cleaned up — can't leave a half-merged state behind:
 * some contacts belonging to both events, and the "merged away" event
 * still hanging around with some of its original members. A throwaway table
 * with an uncleaned FK to events.id stands in for "the final delete gets
 * blocked for some reason nobody anticipated" and forces exactly that
 * mid-cascade failure.
 */
describe("mergeEvents is all-or-nothing", () => {
  it("rolls back the whole merge when the fromId event delete is blocked by an FK", async () => {
    const db = await getDb();
    await db.execute(
      sql`CREATE TABLE IF NOT EXISTS _test_unhandled_event_ref (
        id text PRIMARY KEY,
        event_id text NOT NULL REFERENCES events(id)
      )`,
    );
    try {
      const fromId = await createEvent(`from-${randomUUID()}`);
      const intoId = await createEvent(`into-${randomUUID()}`);

      const memberA = await createContact(person("Rollback A"), "manual");
      const memberB = await createContact(person("Rollback B"), "manual");
      await addContactToEvent(fromId, memberA);
      await addContactToEvent(fromId, memberB);

      // Blocks the final `delete events where id = fromId` inside the
      // transaction, forcing a rollback of everything that already ran in
      // the same transaction (the member copies + the eventContacts
      // delete for fromId).
      await db.execute(
        sql`INSERT INTO _test_unhandled_event_ref (id, event_id) VALUES (${randomUUID()}, ${fromId})`,
      );

      await expect(mergeEvents(fromId, intoId)).rejects.toThrow();

      // fromId is fully intact — nothing was removed.
      expect(await getEvent(fromId)).not.toBeNull();
      const fromMembers = (await listEventContacts(fromId)).map((m) => m.id).sort();
      expect(fromMembers).toEqual([memberA, memberB].sort());

      // intoId gained nothing partial from the failed merge.
      expect(await listEventContacts(intoId)).toHaveLength(0);
    } finally {
      await db.execute(sql`DROP TABLE IF EXISTS _test_unhandled_event_ref`);
    }
  });
});
