import { describe, expect, it } from "vitest";
import { getDb } from "@/lib/db/request-scope";
import { createContactProfile, getContact } from "@/lib/repo/contacts";
import { loadLocalContacts } from "@/lib/repo/sync";
import { reconcileContacts } from "@/lib/repo/sync/reconcile";
import { USER, method, observed, profile, push } from "./helpers";

/**
 * The two-run deletion this option exists to prevent.
 *
 * Microsoft Graph cannot store a second URL or a non-birthday date, so its
 * target reports those fields EMPTY. Run one looks harmless — the merge just
 * sees a Dhaga-only addition. Run two is where the damage happens: the base
 * snapshot now records the links as synced, so the same empty read is no longer
 * "the provider never had them", it is "the user deleted them", and the sweep
 * honours it.
 *
 * The whole point is that this test must FAIL if `unsupportedFields` stops being
 * passed through — which is why it drives the real reconcile against a real
 * database rather than unit-testing the neutralise helper in isolation.
 */
describe("sync — fields a provider cannot represent", () => {
  it("does not delete links a provider cannot report, across two runs", async () => {
    const id = await createContactProfile(
      profile({
        name: "Graph Limited Person",
        emails: [method("graph.limited@example.com")],
        links: [method("https://linkedin.com/in/limited"), method("https://limited.example")],
      }),
      "manual",
    );

    const request = push({
      provider: "microsoft",
      containerId: "microsoft:me",
      full: true,
      contacts: [
        observed({
          externalId: "graph-1",
          name: "Graph Limited Person",
          emails: [method("graph.limited@example.com")],
          // Exactly what Graph hands back: it has nowhere to put them.
          links: [],
        }),
      ],
    });
    const options = { unsupportedFields: ["links"] as const };

    await reconcileContacts(await getDb(), request, options);
    // Run two is the one that used to destroy them: by now the base snapshot
    // holds the links, so an empty read reads as a deliberate removal.
    await reconcileContacts(await getDb(), request, options);

    const after = await getContact(id);
    expect(after?.contact.links.map((l) => l.value).sort()).toEqual([
      "https://limited.example",
      "https://linkedin.com/in/limited",
    ]);
  });

  it("never queues a write for a field the provider cannot store", async () => {
    // Pushing a link Graph has no slot for would fail on every run forever, and
    // the retry would be invisible to the user.
    await createContactProfile(
      profile({
        name: "Graph Push Person",
        emails: [method("graph.push@example.com")],
        links: [method("https://push.example")],
      }),
      "manual",
    );

    const result = await reconcileContacts(
      await getDb(),
      push({
        provider: "microsoft",
        containerId: "microsoft:me",
        full: true,
        contacts: [
          observed({
            externalId: "graph-2",
            name: "Graph Push Person",
            emails: [method("graph.push@example.com")],
            links: [],
          }),
        ],
      }),
      { unsupportedFields: ["links"] },
    );

    expect(result.writes.flatMap((w) => Object.keys(w.fields))).not.toContain("links");
  });

  it("still syncs the fields the provider CAN represent", async () => {
    // Declaring three fields unsupported must not quietly freeze the rest of the
    // contact — otherwise "Outlook sync" would be an elaborate no-op.
    const id = await createContactProfile(
      profile({ name: "Graph Title Person", emails: [method("graph.title@example.com")] }),
      "manual",
    );
    const unsupportedFields = ["links", "addresses", "importantDates"] as const;
    const at = (title: string | null) =>
      push({
        provider: "microsoft",
        containerId: "microsoft:me",
        full: true,
        contacts: [
          observed({
            externalId: "graph-3",
            name: "Graph Title Person",
            title,
            emails: [method("graph.title@example.com")],
          }),
        ],
      });

    // Run one only establishes the base. A first link deliberately keeps Dhaga's
    // value and pushes nothing, because with no base there is no way to tell who
    // edited what — so a title cannot arrive until run two.
    await reconcileContacts(await getDb(), at(null), { unsupportedFields });
    // Now only the remote has moved, which is an uncontested pull.
    await reconcileContacts(await getDb(), at("Head of Ops"), { unsupportedFields });

    // Read back through the sync layer's own reader: it is what the merge sees,
    // and `title` there is the denormalised contacts.title column.
    const local = await loadLocalContacts(await getDb(), [id]);
    expect(local[0]?.contact.title).toBe("Head of Ops");
  });
});
