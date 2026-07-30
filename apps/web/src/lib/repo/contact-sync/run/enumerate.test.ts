import { describe, expect, it, vi } from "vitest";
import { authorisesSweep, enumerateRemote, nextCursor } from "./enumerate";
import type {
  ChangedContactsPage,
  ContactSyncTarget,
  ExternalContact,
} from "@dhaga/core/src/sync/types";

/**
 * The rules that decide what an enumeration is allowed to cause. Each one has a
 * failure mode that destroys or silently drops the user's data, so each is
 * pinned here on its own, away from the run that composes them.
 */

const CONTACT: ExternalContact = {
  externalId: "people/c1",
  containerId: null,
  etag: null,
  name: "Priya Raman",
  nickname: null,
  title: null,
  company: null,
  emails: [],
  phones: [],
  links: [],
  addresses: [],
  importantDates: [],
};

function page(mode: ChangedContactsPage["mode"], cursor: string | null): ChangedContactsPage {
  return { mode, contacts: [CONTACT], cursor };
}

describe("authorisesSweep", () => {
  it("refuses an incremental result", () => {
    // The sweep tombstones every link absent from the batch. In an incremental
    // batch "absent" means "did not change", which is nearly everyone — so
    // authorising it here would unlink almost the whole address book on the
    // first incremental run.
    expect(authorisesSweep(page("incremental", "sync-1"))).toBe(false);
  });

  it("allows a full result, which is the only complete view there is", () => {
    // Deletions have to be detectable somewhere, and a full enumeration is the
    // only batch that can tell "deleted" from "unchanged".
    expect(authorisesSweep(page("full", "sync-1"))).toBe(true);
  });

  it("judges by mode alone, never by how much came back", () => {
    // A quiet week can produce an incremental page with plenty of contacts, and
    // a full page can be small. Size is not evidence of completeness.
    expect(authorisesSweep({ mode: "incremental", contacts: [], cursor: null })).toBe(false);
    expect(authorisesSweep({ mode: "full", contacts: [], cursor: null })).toBe(true);
  });
});

describe("enumerateRemote", () => {
  const baseTarget: ContactSyncTarget = {
    id: "device",
    listContainers: async () => [],
    listChanged: async () => [CONTACT],
    create: async () => ({ externalId: "x", etag: null }),
    patch: async () => ({ externalId: "x", etag: null }),
  };

  it("falls back to the whole address book for a target with no incremental mode", async () => {
    // The mobile device target has no cursor to offer — expo-contacts exposes
    // no modified-since query — and it must keep syncing exactly as before.
    const result = await enumerateRemote(baseTarget, null);

    expect(result.mode).toBe("full");
    expect(result.contacts).toEqual([CONTACT]);
    expect(result.cursor).toBeNull();
  });

  it("hands the stored cursor to a target that has one", async () => {
    const listChangedSince = vi.fn(async () => page("incremental", "sync-2"));
    const result = await enumerateRemote({ ...baseTarget, listChangedSince }, "sync-1");

    expect(listChangedSince).toHaveBeenCalledWith("sync-1");
    expect(result.mode).toBe("incremental");
  });
});

describe("nextCursor", () => {
  it("advances the cursor when the run completed cleanly", () => {
    expect(nextCursor(page("incremental", "sync-2"), 0)).toBe("sync-2");
  });

  it("drops the cursor when a write failed, so the retry can actually happen", () => {
    // A failed push is only ever retried because the next run re-observes that
    // contact and re-derives the write. An incremental run would not re-observe
    // an unchanged contact, so keeping the cursor would make "will retry" a lie.
    expect(nextCursor(page("incremental", "sync-2"), 1)).toBeNull();
  });

  it("passes a missing cursor through as a clear", () => {
    // A provider that issued none this run leaves us nothing to trust; the only
    // cost of clearing is one full enumeration, which is always safe.
    expect(nextCursor(page("full", null), 0)).toBeNull();
  });
});
