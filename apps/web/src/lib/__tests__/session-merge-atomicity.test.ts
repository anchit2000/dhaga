import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { createContact } from "@/lib/repo/contacts";
import {
  addContactToSession,
  createSession,
  getSession,
  listSessionContacts,
  mergeSessions,
} from "@/lib/repo/sessions";

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
 * mergeSessions copies every member of fromId into intoId, then deletes
 * fromId's own sessionContacts rows and the fromId session row itself.
 * Union semantics: overlapping members (the same contact scanned into both
 * sessions) must collapse into one row in intoId, not duplicate, and
 * members unique to each session must all survive the merge.
 */
describe("mergeSessions happy path", () => {
  it("intoId ends up with the union of both sessions' contacts, fromId is gone", async () => {
    const fromId = await createSession(`from-${randomUUID()}`);
    const intoId = await createSession(`into-${randomUUID()}`);

    const shared = await createContact(person("Shared Contact"), "manual");
    const onlyFrom = await createContact(person("Only In From"), "manual");
    const onlyInto = await createContact(person("Only In Into"), "manual");

    await addContactToSession(fromId, shared);
    await addContactToSession(fromId, onlyFrom);
    await addContactToSession(intoId, shared);
    await addContactToSession(intoId, onlyInto);

    await mergeSessions(fromId, intoId);

    const intoMembers = (await listSessionContacts(intoId)).map((m) => m.id).sort();
    expect(intoMembers).toEqual([onlyInto, onlyFrom, shared].sort());

    expect(await getSession(fromId)).toBeNull();
    expect(await listSessionContacts(fromId)).toHaveLength(0);
  });
});

/**
 * The merge is wrapped in one transaction specifically so a failure partway
 * through — after members have already been copied into intoId but before
 * fromId's own rows are cleaned up — can't leave a half-merged state behind:
 * some contacts belonging to both sessions, and the "merged away" session
 * still hanging around with some of its original members. A throwaway table
 * with an uncleaned FK to sessions.id stands in for "the final delete gets
 * blocked for some reason nobody anticipated" and forces exactly that
 * mid-cascade failure.
 */
describe("mergeSessions is all-or-nothing", () => {
  it("rolls back the whole merge when the fromId session delete is blocked by an FK", async () => {
    const db = await getDb();
    await db.execute(
      sql`CREATE TABLE IF NOT EXISTS _test_unhandled_session_ref (
        id text PRIMARY KEY,
        session_id text NOT NULL REFERENCES sessions(id)
      )`,
    );
    try {
      const fromId = await createSession(`from-${randomUUID()}`);
      const intoId = await createSession(`into-${randomUUID()}`);

      const memberA = await createContact(person("Rollback A"), "manual");
      const memberB = await createContact(person("Rollback B"), "manual");
      await addContactToSession(fromId, memberA);
      await addContactToSession(fromId, memberB);

      // Blocks the final `delete sessions where id = fromId` inside the
      // transaction, forcing a rollback of everything that already ran in
      // the same transaction (the member copies + the sessionContacts
      // delete for fromId).
      await db.execute(
        sql`INSERT INTO _test_unhandled_session_ref (id, session_id) VALUES (${randomUUID()}, ${fromId})`,
      );

      await expect(mergeSessions(fromId, intoId)).rejects.toThrow();

      // fromId is fully intact — nothing was removed.
      expect(await getSession(fromId)).not.toBeNull();
      const fromMembers = (await listSessionContacts(fromId)).map((m) => m.id).sort();
      expect(fromMembers).toEqual([memberA, memberB].sort());

      // intoId gained nothing partial from the failed merge.
      expect(await listSessionContacts(intoId)).toHaveLength(0);
    } finally {
      await db.execute(sql`DROP TABLE IF EXISTS _test_unhandled_session_ref`);
    }
  });
});
