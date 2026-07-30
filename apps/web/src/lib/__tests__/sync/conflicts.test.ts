import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { contacts } from "@/lib/db/schema";
import { createContactProfile, getContact } from "@/lib/repo/contacts";
import {
  listPendingSyncConflicts,
  pushContactSync,
  resolveSyncConflict,
} from "@/lib/repo/sync";
import { SYNC_CONFLICT_KEEP_DHAGA, SYNC_CONFLICT_KEEP_PHONE } from "@/utils/constants/sync";
import { USER, observed, profile, push } from "./helpers";

/**
 * The merge resolves a both-edited field by adopting the PHONE's value, on
 * purpose — the edit typed on the handset must survive. That is only defensible
 * if the Dhaga value it discards is kept. Returning it in the push response is
 * not keeping it: the client drops the body and the user's edit is gone with no
 * way back, which is precisely the data loss the three-way design exists to
 * prevent.
 *
 * So these tests assert on state that OUTLIVES the request — what a later,
 * independent read finds — never on the response object.
 */

/** Edit a contact in Dhaga, the way a user would, so the next run sees the
 *  local side as having moved away from the base. */
async function editInDhaga(contactId: string, nickname: string): Promise<void> {
  const db = await getDb();
  await db.update(contacts).set({ nickname }).where(eq(contacts.id, contactId));
}

async function link(externalId: string, name: string, nickname: string): Promise<void> {
  await pushContactSync(
    USER,
    push({
      containerId: "container-conflicts",
      contacts: [observed({ externalId, name, nickname })],
    }),
  );
}

describe("sync conflicts survive the request that created them", () => {
  it("persists the Dhaga value a both-edited scalar discarded", async () => {
    const id = await createContactProfile(profile({ name: "Conflict Persist" }), "manual");
    await link("persist-1", "Conflict Persist", "Base");

    await editInDhaga(id, "Dhaga's nickname");
    const run = await pushContactSync(
      USER,
      push({
        containerId: "container-conflicts",
        contacts: [
          observed({ externalId: "persist-1", name: "Conflict Persist", nickname: "Phone's nickname" }),
        ],
      }),
    );
    // Merge semantics unchanged: the phone still wins in Dhaga.
    expect(run.conflicts).toHaveLength(1);
    expect((await getContact(id))?.contact.nickname).toBe("Phone's nickname");

    // The part that used to be missing — a read that knows nothing about the
    // run above can still find what Dhaga lost.
    const pending = await listPendingSyncConflicts(await getDb());
    const row = pending.find((entry) => entry.contactId === id);
    expect(row?.conflicts).toHaveLength(1);
    expect(row?.conflicts[0]).toMatchObject({
      field: "nickname",
      kind: "both_edited",
      local: "Dhaga's nickname",
      remote: "Phone's nickname",
    });
    expect(Date.parse(row?.conflicts[0].at ?? "")).not.toBeNaN();
  });

  it("keeps the conflict across later syncs that see no divergence", async () => {
    const id = await createContactProfile(profile({ name: "Conflict Sticky" }), "manual");
    await link("sticky-1", "Conflict Sticky", "Base");
    await editInDhaga(id, "Dhaga only");
    await pushContactSync(
      USER,
      push({
        containerId: "container-conflicts",
        contacts: [observed({ externalId: "sticky-1", name: "Conflict Sticky", nickname: "Phone only" })],
      }),
    );

    // After a conflict, both sides agree (Dhaga adopted the phone's value), so
    // the next run reports nothing. Clearing on "no conflict this run" would
    // destroy the record one run after making it — the original bug, moved.
    await pushContactSync(
      USER,
      push({
        containerId: "container-conflicts",
        contacts: [observed({ externalId: "sticky-1", name: "Conflict Sticky", nickname: "Phone only" })],
      }),
    );

    const pending = await listPendingSyncConflicts(await getDb());
    expect(pending.find((entry) => entry.contactId === id)?.conflicts).toHaveLength(1);
  });

  it("clears the conflict once the divergence is gone", async () => {
    const id = await createContactProfile(profile({ name: "Conflict Clears" }), "manual");
    await link("clears-1", "Conflict Clears", "Base");
    await editInDhaga(id, "Dhaga wanted this");
    await pushContactSync(
      USER,
      push({
        containerId: "container-conflicts",
        contacts: [observed({ externalId: "clears-1", name: "Conflict Clears", nickname: "Phone wanted this" })],
      }),
    );
    expect(
      (await listPendingSyncConflicts(await getDb())).find((entry) => entry.contactId === id),
    ).toBeDefined();

    // The user types the Dhaga value back on the phone. There is nothing left to
    // decide, so a stale prompt must not sit in the inbox forever.
    await pushContactSync(
      USER,
      push({
        containerId: "container-conflicts",
        contacts: [observed({ externalId: "clears-1", name: "Conflict Clears", nickname: "Dhaga wanted this" })],
      }),
    );

    const pending = await listPendingSyncConflicts(await getDb());
    expect(pending.find((entry) => entry.contactId === id)).toBeUndefined();
    expect((await getContact(id))?.contact.nickname).toBe("Dhaga wanted this");
  });

  it("restores the Dhaga value when the user keeps it, and drops the row", async () => {
    const id = await createContactProfile(profile({ name: "Conflict Restore" }), "manual");
    await link("restore-1", "Conflict Restore", "Base");
    await editInDhaga(id, "Restore me");
    await pushContactSync(
      USER,
      push({
        containerId: "container-conflicts",
        contacts: [observed({ externalId: "restore-1", name: "Conflict Restore", nickname: "Overwrote it" })],
      }),
    );

    const db = await getDb();
    const row = (await listPendingSyncConflicts(db)).find((entry) => entry.contactId === id);
    expect(row).toBeDefined();
    const applied = await resolveSyncConflict(db, {
      linkId: row?.linkId ?? "",
      field: "nickname",
      choice: SYNC_CONFLICT_KEEP_DHAGA,
    });

    expect(applied).toBe(true);
    // The value is BACK on the contact — the whole promise, in one assertion.
    expect((await getContact(id))?.contact.nickname).toBe("Restore me");
    expect(
      (await listPendingSyncConflicts(db)).find((entry) => entry.contactId === id),
    ).toBeUndefined();

    // Dhaga is now the side that moved away from the base, so the next run
    // carries the restored value out to the phone rather than adopting the
    // phone's value a second time.
    const next = await pushContactSync(
      USER,
      push({
        containerId: "container-conflicts",
        contacts: [observed({ externalId: "restore-1", name: "Conflict Restore", nickname: "Overwrote it" })],
      }),
    );
    expect(next.writes).toHaveLength(1);
    expect(next.writes[0].fields.nickname).toBe("Restore me");
    expect(next.conflicts).toEqual([]);
  });

  it("keeps the phone's value without touching the contact, and drops the row", async () => {
    const id = await createContactProfile(profile({ name: "Conflict Accept" }), "manual");
    await link("accept-1", "Conflict Accept", "Base");
    await editInDhaga(id, "Discard me");
    await pushContactSync(
      USER,
      push({
        containerId: "container-conflicts",
        contacts: [observed({ externalId: "accept-1", name: "Conflict Accept", nickname: "Winner" })],
      }),
    );

    const db = await getDb();
    const row = (await listPendingSyncConflicts(db)).find((entry) => entry.contactId === id);
    expect(
      await resolveSyncConflict(db, {
        linkId: row?.linkId ?? "",
        field: "nickname",
        choice: SYNC_CONFLICT_KEEP_PHONE,
      }),
    ).toBe(true);

    expect((await getContact(id))?.contact.nickname).toBe("Winner");
    expect(
      (await listPendingSyncConflicts(db)).find((entry) => entry.contactId === id),
    ).toBeUndefined();
  });
});
