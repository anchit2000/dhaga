import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGoogleContactTarget } from "./target";
import type { ChangedContactsPage, ContactSyncTarget } from "../types";

/**
 * Incremental sync against the People API, with fetch mocked — there are no
 * live credentials in this repo, so what is proven here is the REQUEST shape and
 * the decisions made from a response, never that Google behaves as documented.
 *
 * The property that matters most is the one an integration test could not check
 * cheaply anyway: an incremental page must be labelled incremental, because
 * downstream that label is the sole thing standing between the user and a sweep
 * that unlinks their whole address book.
 */

let calls: string[] = [];

beforeEach(() => {
  calls = [];
});

afterEach(() => {
  vi.unstubAllGlobals();
});

interface PeoplePage {
  connections?: unknown[];
  nextSyncToken?: string;
}

/** Answers each request in order, recording the URL it was asked for. */
function stubPeople(...pages: PeoplePage[]): void {
  const queue = [...pages];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      calls.push(url);
      const page = queue.shift() ?? {};
      return new Response(JSON.stringify(page), { status: 200 });
    }),
  );
}

/** Answers 410 GONE once — Google's "your syncToken aged out" — then pages. */
function stubExpiredThen(...pages: PeoplePage[]): void {
  const queue = [...pages];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      calls.push(url);
      if (calls.length === 1) {
        return new Response(JSON.stringify({ error: { code: 410 } }), { status: 410 });
      }
      return new Response(JSON.stringify(queue.shift() ?? {}), { status: 200 });
    }),
  );
}

function person(id: string, name: string): Record<string, unknown> {
  return { resourceName: id, etag: `etag-${id}`, names: [{ displayName: name }] };
}

function listChangedSince(
  target: ContactSyncTarget,
  cursor: string | null,
): Promise<ChangedContactsPage> {
  if (!target.listChangedSince) {
    throw new Error("The Google target must offer incremental sync; without it every run is full");
  }
  return target.listChangedSince(cursor);
}

describe("Google incremental enumeration", () => {
  const target = createGoogleContactTarget({ accessToken: "token" });

  it("enumerates everything and mints a cursor when it holds none", async () => {
    stubPeople({ connections: [person("people/c1", "Priya")], nextSyncToken: "sync-1" });

    const page = await listChangedSince(target, null);

    // Full, because with no cursor there is nothing to be incremental FROM —
    // and only a full page is allowed to authorise the deletion sweep.
    expect(page.mode).toBe("full");
    expect(page.cursor).toBe("sync-1");
    expect(page.contacts).toHaveLength(1);
    // Without requestSyncToken every run stays full forever, which is the bug
    // this change exists to fix.
    expect(calls[0]).toContain("requestSyncToken=true");
    expect(calls[0]).not.toContain("syncToken=sync");
  });

  it("sends a stored cursor as syncToken and labels the result incremental", async () => {
    stubPeople({ connections: [person("people/c2", "Arun")], nextSyncToken: "sync-2" });

    const page = await listChangedSince(target, "sync-1");

    expect(calls[0]).toContain("syncToken=sync-1");
    // THE guarantee. Marking this "full" would tell reconcile that every
    // contact absent from a changes-only batch had been deleted.
    expect(page.mode).toBe("incremental");
    expect(page.cursor).toBe("sync-2");
  });

  it("drops deletion tombstones instead of passing them off as empty contacts", async () => {
    // Google reports a person deleted since the token as a bare resourceName.
    // personToSyncable would render that as a contact with no name, no emails
    // and no phones; the merge, holding a base snapshot that says those fields
    // were synced, would then write the emptiness back into Dhaga as the user
    // deleting their own data.
    stubPeople({
      connections: [
        { resourceName: "people/c3", metadata: { deleted: true } },
        person("people/c4", "Meera"),
      ],
      nextSyncToken: "sync-3",
    });

    const page = await listChangedSince(target, "sync-2");

    expect(page.contacts.map((contact) => contact.externalId)).toEqual(["people/c4"]);
  });

  it("recovers from an expired cursor with a full enumeration and a fresh one", async () => {
    // 410 GONE is Google saying "clear your cache and retry without the token".
    // Surfacing it as a run failure would strand the connection on a dead
    // cursor forever.
    stubExpiredThen({ connections: [person("people/c5", "Sam")], nextSyncToken: "sync-9" });

    const page = await listChangedSince(target, "stale-token");

    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain("syncToken=stale-token");
    expect(calls[1]).not.toContain("syncToken=stale-token");
    // Re-labelled full, and truthfully so: this run really did see everything,
    // so it is also the run that may detect deletions.
    expect(page.mode).toBe("full");
    expect(page.cursor).toBe("sync-9");
    expect(page.contacts).toHaveLength(1);
  });

  it("keeps listChanged as the complete-address-book answer", async () => {
    // The mobile device target has no cursor, so this contract method has to
    // stay honest for every caller that never learns about incremental sync.
    stubPeople({ connections: [person("people/c6", "Dev")], nextSyncToken: "sync-6" });

    const contacts = await target.listChanged(null);

    expect(contacts).toHaveLength(1);
    expect(calls[0]).not.toContain("syncToken=");
  });
});
