import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMicrosoftContactTarget } from "./target";
import type { ChangedContactsPage, ContactSyncTarget } from "../types";

/**
 * Incremental sync against Microsoft Graph, with fetch mocked — there are no
 * live credentials in this repo, so what is proven here is the REQUEST shape and
 * the decisions made from a response, never that Graph behaves as documented.
 *
 * Mirrors ../google-provider/incremental.test.ts deliberately: the two providers
 * must not drift on the one property that protects the user's data, which is
 * that a changes-only batch is labelled incremental and can never authorise the
 * deletion sweep.
 */

let calls: string[] = [];

beforeEach(() => {
  calls = [];
});

afterEach(() => {
  vi.unstubAllGlobals();
});

interface DeltaPage {
  value?: unknown[];
  "@odata.nextLink"?: string;
  "@odata.deltaLink"?: string;
}

function stubGraph(...pages: DeltaPage[]): void {
  const queue = [...pages];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      calls.push(url);
      return new Response(JSON.stringify(queue.shift() ?? {}), { status: 200 });
    }),
  );
}

/** Answers 410 GONE once — Graph's `resyncRequired` — then serves pages. */
function stubExpiredThen(...pages: DeltaPage[]): void {
  const queue = [...pages];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      calls.push(url);
      if (calls.length === 1) {
        return new Response(JSON.stringify({ error: { code: "resyncRequired" } }), { status: 410 });
      }
      return new Response(JSON.stringify(queue.shift() ?? {}), { status: 200 });
    }),
  );
}

function contact(id: string, name: string): Record<string, unknown> {
  return { id, "@odata.etag": `etag-${id}`, displayName: name };
}

function listChangedSince(
  target: ContactSyncTarget,
  cursor: string | null,
): Promise<ChangedContactsPage> {
  if (!target.listChangedSince) {
    throw new Error("The Graph target must offer incremental sync; without it every run is full");
  }
  return target.listChangedSince(cursor);
}

describe("Microsoft Graph incremental enumeration", () => {
  const target = createMicrosoftContactTarget({ accessToken: "token" });

  it("starts from the delta endpoint and keeps the deltaLink when it holds none", async () => {
    stubGraph({
      value: [contact("AAA1", "Priya")],
      "@odata.deltaLink": "https://graph.test/delta?token=d1",
    });

    const page = await listChangedSince(target, null);

    // Full, because a first delta call returns the entire folder — and only a
    // full page is allowed to authorise the deletion sweep.
    expect(page.mode).toBe("full");
    expect(page.cursor).toBe("https://graph.test/delta?token=d1");
    expect(calls[0]).toContain("/me/contacts/delta");
  });

  it("follows a stored deltaLink and labels the result incremental", async () => {
    stubGraph({
      value: [contact("AAA2", "Arun")],
      "@odata.deltaLink": "https://graph.test/delta?token=d2",
    });

    const page = await listChangedSince(target, "https://graph.test/delta?token=d1");

    expect(calls[0]).toBe("https://graph.test/delta?token=d1");
    // THE guarantee. Marking this "full" would tell reconcile that every
    // contact absent from a changes-only batch had been deleted.
    expect(page.mode).toBe("incremental");
    expect(page.cursor).toBe("https://graph.test/delta?token=d2");
  });

  it("pages to the end before reporting a cursor", async () => {
    // The deltaLink only arrives on the final page. Returning early would store
    // no cursor and quietly condemn every future run to a full enumeration.
    stubGraph(
      { value: [contact("AAA3", "Meera")], "@odata.nextLink": "https://graph.test/next?p=2" },
      { value: [contact("AAA4", "Dev")], "@odata.deltaLink": "https://graph.test/delta?token=d3" },
    );

    const page = await listChangedSince(target, null);

    expect(calls).toHaveLength(2);
    expect(page.contacts).toHaveLength(2);
    expect(page.cursor).toBe("https://graph.test/delta?token=d3");
  });

  it("drops removed records instead of passing them off as empty contacts", async () => {
    // Graph reports a deletion as `{ id, "@removed" }` with no properties.
    // graphToSyncable would render that as a contact with no name and no
    // emails; the merge, holding a base snapshot that says those fields were
    // synced, would write the emptiness back into Dhaga as a deletion the user
    // never asked for.
    stubGraph({
      value: [
        { id: "AAA5", "@removed": { reason: "deleted" } },
        contact("AAA6", "Sam"),
      ],
      "@odata.deltaLink": "https://graph.test/delta?token=d4",
    });

    const page = await listChangedSince(target, "https://graph.test/delta?token=d3");

    expect(page.contacts.map((entry) => entry.externalId)).toEqual(["AAA6"]);
  });

  it("recovers from an invalidated deltaLink with a full enumeration", async () => {
    // Graph answers a dead deltaLink with 410 + resyncRequired, meaning "start
    // over". Surfacing it as a run failure would strand the connection forever.
    stubExpiredThen({
      value: [contact("AAA7", "Nina")],
      "@odata.deltaLink": "https://graph.test/delta?token=d9",
    });

    const page = await listChangedSince(target, "https://graph.test/delta?token=dead");

    expect(calls).toHaveLength(2);
    expect(calls[1]).toContain("/me/contacts/delta");
    expect(page.mode).toBe("full");
    expect(page.cursor).toBe("https://graph.test/delta?token=d9");
  });

  it("keeps listChanged on the plain listing, unchanged by incremental sync", async () => {
    // Contract method for callers that never learn about cursors. It must stay
    // the honest whole-address-book answer.
    stubGraph({ value: [contact("AAA8", "Ravi")] });

    const contacts = await target.listChanged(null);

    expect(contacts).toHaveLength(1);
    expect(calls[0]).toContain("/me/contacts?");
    expect(calls[0]).not.toContain("delta");
  });
});
