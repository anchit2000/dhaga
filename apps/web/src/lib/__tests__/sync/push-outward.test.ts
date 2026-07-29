import { describe, expect, it } from "vitest";
import { getDb } from "@/lib/db/request-scope";
import { contacts } from "@/lib/db/schema";
import { createContactProfile } from "@/lib/repo/contacts";
import { ackContactSync, listLinks, pushContactSync } from "@/lib/repo/sync";
import { USER, observed, profile, push } from "./helpers";

/**
 * The outward half: Dhaga contacts with no counterpart on a provider. Writing
 * into an address book propagates to every device signed into it, so this
 * direction is caller-gated rather than a side effect of syncing — and the ack
 * is what stops the next run from pushing a second copy of everything.
 */
describe("sync push outward", () => {
  it("offers unlinked contacts only when asked, never inferred stubs, and links on ack", async () => {
    const id = await createContactProfile(profile({ name: "Sync Pushable Person" }), "manual");
    // A "mentioned" stub — a name an extraction lifted out of a note. No
    // ContactSource covers it, so it is inserted the way the graph writes it.
    const db = await getDb();
    await db.insert(contacts).values({
      id: "sync-mentioned-stub",
      name: "Sync Mentioned Stub",
      emails: [],
      phones: [],
      links: [],
      tags: [],
      source: "mentioned",
    });

    const batch = push({
      provider: "microsoft",
      containerId: "container-push",
      contacts: [observed({ externalId: "push-seed", name: "Sync Seed Person" })],
    });

    const withoutFlag = await pushContactSync(USER, batch);
    expect(withoutFlag.writes.filter((write) => write.externalId === null)).toEqual([]);

    const withFlag = await pushContactSync(USER, batch, { pushUnlinked: true });
    const creates = withFlag.writes.filter((write) => write.externalId === null);
    expect(creates.some((write) => write.contactId === id)).toBe(true);
    // Inferred data must never be written into an address book: it leaves the
    // user's control the moment it lands there.
    expect(creates.some((write) => write.contactId === "sync-mentioned-stub")).toBe(false);
    // The contact that came FROM this provider is already linked — not offered.
    expect(creates.some((write) => write.fields.name === "Sync Seed Person")).toBe(false);

    const ack = await ackContactSync(USER, {
      provider: "microsoft",
      results: [{ contactId: id, externalId: "pushed-1", etag: "etag-1" }],
    });
    expect(ack.acknowledged).toBe(1);
    const created = (await listLinks(db, "microsoft")).find(
      (link) => link.externalId === "pushed-1",
    );
    expect(created?.contactId).toBe(id);
    expect(created?.etag).toBe("etag-1");
    // The push has landed, so both sides hold this now — recording it as the
    // base is what stops the next run re-pushing what it just wrote.
    expect(created?.baseSnapshot.name).toBe("Sync Pushable Person");

    const after = await pushContactSync(USER, batch, { pushUnlinked: true });
    expect(after.writes.filter((write) => write.contactId === id)).toEqual([]);
  });

  it("ignores acks for contacts it does not hold, and is idempotent", async () => {
    const id = await createContactProfile(profile({ name: "Sync Ack Person" }), "manual");
    const first = await ackContactSync(USER, {
      provider: "device",
      results: [
        { contactId: id, externalId: "ack-1", etag: null },
        // Stale client state, or another user's id: must not create an orphan link.
        { contactId: "no-such-contact", externalId: "ack-ghost", etag: null },
      ],
    });
    expect(first.acknowledged).toBe(1);

    const second = await ackContactSync(USER, {
      provider: "device",
      results: [{ contactId: id, externalId: "ack-1", etag: "etag-2" }],
    });
    expect(second.acknowledged).toBe(1);
    const links = await listLinks(await getDb(), "device");
    expect(links.filter((link) => link.contactId === id)).toHaveLength(1);
    expect(links.find((link) => link.contactId === id)?.etag).toBe("etag-2");
    expect(links.some((link) => link.externalId === "ack-ghost")).toBe(false);
  });
});
