import { describe, expect, it } from "vitest";

import { getDb } from "@/lib/db/request-scope";
import { createContactProfile } from "@/lib/repo/contacts";
import { listLinks, pushContactSync } from "@/lib/repo/sync";

import { USER, observed, profile, push } from "./helpers";

/**
 * What may authorise the deletion sweep, and what may not.
 *
 * The sweep unlinks every link whose external id is absent from the set the
 * request proves the container held. That makes the AUTHORISING SIGNAL itself
 * dangerous: get it wrong and one request tombstones a user's whole address
 * book. `[]` is truthy in JavaScript, so `if (request.observedExternalIds)`
 * accepted an empty list as proof the container was empty — letting any
 * authenticated caller unlink everything with a two-character payload.
 *
 * "I observed nothing" is indistinguishable from "I failed to enumerate", so
 * neither may sweep. A genuinely emptied address book has to arrive as a
 * deliberate signal, never as the absence of one.
 */
describe("sync sweep authorisation", () => {
  it("does not sweep on an empty observed-id list", async () => {
    const id = await createContactProfile(profile({ name: "Sweep Guard Empty Ids" }), "manual");
    await pushContactSync(
      USER,
      push({
        provider: "google",
        containerId: "container-guard-ids",
        contacts: [observed({ externalId: "guard-ids-1", name: "Sweep Guard Empty Ids" })],
      }),
    );

    // A later run that enumerated nothing. Before the guard this unlinked
    // every link in the container.
    await pushContactSync(
      USER,
      push({
        provider: "google",
        containerId: "container-guard-ids",
        contacts: [observed({ externalId: "guard-ids-1", name: "Sweep Guard Empty Ids" })],
        observedExternalIds: [],
      }),
    );

    const links = await listLinks(await getDb(), "google");
    const link = links.find((l) => l.contactId === id);
    expect(link?.state).toBe("linked");
  });

  it("does not sweep the container when a full batch carries no contacts", async () => {
    const id = await createContactProfile(profile({ name: "Sweep Guard Empty Full" }), "manual");
    await pushContactSync(
      USER,
      push({
        provider: "google",
        containerId: "container-guard-full",
        contacts: [observed({ externalId: "guard-full-1", name: "Sweep Guard Empty Full" })],
      }),
    );

    // `full: true` with nothing in it is the same unproven claim, reached
    // through the repo layer rather than the route (the wire schema's
    // `contacts.min(1)` rejects this shape, but the repo must not rely on that).
    await pushContactSync(
      USER,
      push({ provider: "google", containerId: "container-guard-full", contacts: [], full: true }),
    );

    const links = await listLinks(await getDb(), "google");
    const link = links.find((l) => l.contactId === id);
    expect(link?.state).toBe("linked");
  });

  it("still sweeps when the id list genuinely proves a record is gone", async () => {
    // The guard must not have disabled the feature it protects.
    const id = await createContactProfile(profile({ name: "Sweep Guard Real" }), "manual");
    const other = await createContactProfile(profile({ name: "Sweep Guard Survivor" }), "manual");
    await pushContactSync(
      USER,
      push({
        provider: "google",
        containerId: "container-guard-real",
        contacts: [
          observed({ externalId: "guard-real-1", name: "Sweep Guard Real" }),
          observed({ externalId: "guard-real-2", name: "Sweep Guard Survivor" }),
        ],
      }),
    );

    await pushContactSync(
      USER,
      push({
        provider: "google",
        containerId: "container-guard-real",
        contacts: [observed({ externalId: "guard-real-2", name: "Sweep Guard Survivor" })],
        observedExternalIds: ["guard-real-2"],
      }),
    );

    const links = await listLinks(await getDb(), "google");
    expect(links.find((l) => l.contactId === id)?.state).toBe("unlinked");
    expect(links.find((l) => l.contactId === other)?.state).toBe("linked");
  });
});
