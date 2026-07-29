import { describe, expect, it } from "vitest";
import { syncPushRequestSchema } from "@/app/api/sync/contacts/schema";
import { getDb } from "@/lib/db/request-scope";
import { createContactProfile, getContact } from "@/lib/repo/contacts";
import { listLinks, pushContactSync } from "@/lib/repo/sync";
import { SYNC_MAX_OBSERVED_IDS } from "@/utils/constants/sync";
import { USER, observed, profile, push } from "./helpers";

/**
 * Only a COMPLETE batch can distinguish "deleted on the device" from "not sent
 * this time". Reading a partial batch as a set of deletions would unlink a
 * user's entire address book on their first incremental sync — and even a full
 * batch only ever tombstones the LINK: a record vanishing from a phone is not
 * consent to destroy the notes, facts and edges Dhaga holds about that person.
 */
describe("sync deletion", () => {
  it("never unlinks on a partial batch, and never deletes the contact on a full one", async () => {
    const id = await createContactProfile(profile({ name: "Sync Deletable Person" }), "manual");
    await pushContactSync(
      USER,
      push({
        provider: "google",
        containerId: "container-delete",
        contacts: [observed({ externalId: "delete-1", name: "Sync Deletable Person" })],
      }),
    );

    // Partial batch that does not mention it: "not sent" is not "deleted".
    await pushContactSync(
      USER,
      push({
        provider: "google",
        containerId: "container-delete",
        contacts: [observed({ externalId: "delete-other", name: "Sync Other Person" })],
        full: false,
      }),
    );
    const afterPartial = await listLinks(await getDb(), "google");
    expect(afterPartial.find((link) => link.externalId === "delete-1")?.state).toBe("linked");

    // A full batch from ANOTHER container says nothing about this one.
    await pushContactSync(
      USER,
      push({
        provider: "google",
        containerId: "container-delete-other",
        contacts: [observed({ externalId: "delete-elsewhere", name: "Sync Elsewhere Person" })],
        full: true,
      }),
    );
    const afterOther = await listLinks(await getDb(), "google");
    expect(afterOther.find((link) => link.externalId === "delete-1")?.state).toBe("linked");

    // Complete batch for this container with the record gone: tombstone the
    // link, keep the contact.
    await pushContactSync(
      USER,
      push({
        provider: "google",
        containerId: "container-delete",
        contacts: [observed({ externalId: "delete-other", name: "Sync Other Person" })],
        full: true,
      }),
    );
    const afterFull = await listLinks(await getDb(), "google");
    expect(afterFull.find((link) => link.externalId === "delete-1")?.state).toBe("unlinked");
    expect((await getContact(id))?.contact.name).toBe("Sync Deletable Person");
  });

  it("revives a tombstoned link when the same record comes back", async () => {
    await pushContactSync(
      USER,
      push({
        provider: "microsoft",
        containerId: "container-revive",
        contacts: [observed({ externalId: "revive-1", name: "Sync Revived Person" })],
        full: true,
      }),
    );
    await pushContactSync(
      USER,
      push({
        provider: "microsoft",
        containerId: "container-revive",
        contacts: [observed({ externalId: "revive-other", name: "Sync Placeholder Person" })],
        full: true,
      }),
    );
    expect(
      (await listLinks(await getDb(), "microsoft")).find((l) => l.externalId === "revive-1")?.state,
    ).toBe("unlinked");

    const back = await pushContactSync(
      USER,
      push({
        provider: "microsoft",
        containerId: "container-revive",
        contacts: [observed({ externalId: "revive-1", name: "Sync Revived Person" })],
      }),
    );
    // Reconciled through the existing row, not a second link for the same pair.
    expect(back.linked).toBe(0);
    const links = await listLinks(await getDb(), "microsoft");
    expect(links.filter((link) => link.externalId === "revive-1")).toHaveLength(1);
    expect(links.find((link) => link.externalId === "revive-1")?.state).toBe("linked");
  });

  /**
   * An address book past SYNC_MAX_CONTACTS cannot be shipped in one request, so
   * no chunk of it may claim to be complete. `observedExternalIds` on the FINAL
   * chunk carries the whole container's id set instead — small, stateless, and
   * the only thing in a chunked run that can authorise a deletion.
   */
  it("sweeps from the final chunk's id set, and from no chunk before it", async () => {
    const state = async (externalId: string): Promise<string | undefined> =>
      (await listLinks(await getDb(), "device")).find((link) => link.externalId === externalId)
        ?.state;

    for (const externalId of ["chunk-gone", "chunk-kept", "chunk-last"]) {
      await pushContactSync(
        USER,
        push({
          containerId: "container-chunked",
          contacts: [observed({ externalId, name: `Sync Chunk ${externalId}` })],
        }),
      );
    }

    // Chunk 1 of a run where "chunk-gone" has been deleted on the device. No id
    // set yet, so it must tombstone NOTHING — not the deleted record, and not
    // the two records this chunk simply did not carry.
    await pushContactSync(
      USER,
      push({
        containerId: "container-chunked",
        contacts: [observed({ externalId: "chunk-kept", name: "Sync Chunk chunk-kept" })],
      }),
    );
    expect(await state("chunk-gone")).toBe("linked");
    expect(await state("chunk-last")).toBe("linked");

    // Final chunk. Its CONTACTS are only the tail, but its id set is the whole
    // container — so "chunk-kept", absent from this batch, survives, and
    // "chunk-gone", absent from the container, does not.
    await pushContactSync(
      USER,
      push({
        containerId: "container-chunked",
        contacts: [observed({ externalId: "chunk-last", name: "Sync Chunk chunk-last" })],
        observedExternalIds: ["chunk-kept", "chunk-last"],
      }),
    );
    expect(await state("chunk-gone")).toBe("unlinked");
    expect(await state("chunk-kept")).toBe("linked");
    expect(await state("chunk-last")).toBe("linked");
  });

  it("believes the id set over `full` when a caller sends both", async () => {
    // `full` describes the CONTACTS; the id set describes the container. When
    // they disagree the id set is the more complete claim, so it decides — a
    // client that chunks and still sets `full` must not delete the chunks it
    // already sent.
    await pushContactSync(
      USER,
      push({
        containerId: "container-precedence",
        contacts: [observed({ externalId: "precedence-early", name: "Sync Precedence Early" })],
      }),
    );
    await pushContactSync(
      USER,
      push({
        containerId: "container-precedence",
        contacts: [observed({ externalId: "precedence-late", name: "Sync Precedence Late" })],
        full: true,
        observedExternalIds: ["precedence-early", "precedence-late"],
      }),
    );

    const links = await listLinks(await getDb(), "device");
    expect(links.find((link) => link.externalId === "precedence-early")?.state).toBe("linked");
  });

  it("refuses an id list too large to be one sweep", () => {
    // The ceiling is generous because ids are tiny, but unbounded is not an
    // option on a public endpoint: this array is parsed into memory whole.
    const body = {
      provider: "device",
      containerId: "container-huge",
      contacts: [observed({ externalId: "huge-1", name: "Sync Huge Person" })],
      full: false,
    };
    expect(
      syncPushRequestSchema.safeParse({
        ...body,
        observedExternalIds: Array.from({ length: SYNC_MAX_OBSERVED_IDS }, (_u, i) => `id-${i}`),
      }).success,
    ).toBe(true);
    expect(
      syncPushRequestSchema.safeParse({
        ...body,
        observedExternalIds: Array.from({ length: SYNC_MAX_OBSERVED_IDS + 1 }, (_u, i) => `id-${i}`),
      }).success,
    ).toBe(false);
  });
});
