import { beforeEach, describe, expect, it, vi } from "vitest";
import { runContactSync } from "./index";
import type {
  ChangedContactsPage,
  ContactSyncTarget,
  ExternalContact,
} from "@dhaga/core/src/sync/types";
import type { ContactConnectionRow } from "@/lib/db/schema";

/**
 * What the run actually hands the reconcile.
 *
 * ./enumerate.test.ts pins the rules; this file proves the run OBEYS them.
 * Without it, someone could hardcode `full: true` back into ./index.ts — the
 * exact bug that would unlink a user's whole address book on their first
 * incremental sync — and every predicate test would still pass.
 *
 * Everything touching the database or the network is mocked: there are no live
 * provider credentials here, so no HTTP path is exercised for real.
 */

const mocks = vi.hoisted(() => ({
  reconcileContacts: vi.fn(),
  acknowledgeWrites: vi.fn(),
  recordSyncRun: vi.fn(),
  syncableConnectionRows: vi.fn(),
  usableAccessToken: vi.fn(),
  providerFor: vi.fn(),
}));

vi.mock("@/lib/db/request-scope", () => ({
  getDb: async () => ({}),
  withUserDb: async <T,>(_userId: string, fn: () => Promise<T>): Promise<T> => fn(),
}));
vi.mock("@/lib/repo/sync/reconcile", () => ({ reconcileContacts: mocks.reconcileContacts }));
vi.mock("@/lib/repo/sync/ack", () => ({ acknowledgeWrites: mocks.acknowledgeWrites }));
vi.mock("../connections", () => ({
  providerFor: mocks.providerFor,
  recordSyncRun: mocks.recordSyncRun,
  syncableConnectionRows: mocks.syncableConnectionRows,
  usableAccessToken: mocks.usableAccessToken,
}));

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

function connectionRow(syncCursor: string | null): ContactConnectionRow {
  return {
    id: "conn-1",
    provider: "google",
    accountEmail: "owner@example.test",
    accessToken: "cipher",
    refreshToken: null,
    expiresAt: null,
    scope: "https://www.googleapis.com/auth/contacts",
    status: "connected",
    syncEnabled: true,
    pushUnlinked: false,
    syncCursor,
    lastSyncedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

interface TargetOverrides {
  patch?: ContactSyncTarget["patch"];
}

function stubTarget(page: ChangedContactsPage, overrides: TargetOverrides = {}): ContactSyncTarget {
  return {
    id: "google",
    listContainers: async () => [
      { id: "google:me", name: "Google Contacts", type: "google", syncsRemotely: true },
    ],
    listChanged: async () => page.contacts,
    listChangedSince: vi.fn(async () => page),
    create: async () => ({ externalId: "people/new", etag: null }),
    patch: overrides.patch ?? (async () => ({ externalId: "people/c1", etag: "etag-2" })),
  };
}

/** Arrange one connected Google account whose enumeration answers with `page`. */
function arrange(
  row: ContactConnectionRow,
  page: ChangedContactsPage,
  overrides: TargetOverrides = {},
): ContactSyncTarget {
  const target = stubTarget(page, overrides);
  mocks.syncableConnectionRows.mockResolvedValue([row]);
  mocks.usableAccessToken.mockResolvedValue("access-token");
  mocks.providerFor.mockReturnValue({
    capabilitiesFromScope: () => ({ read: true, write: true }),
    createTarget: () => target,
  });
  return target;
}

/** The SyncPushRequest the run built, as reconcile received it. */
function requestSentToReconcile(): { full: boolean; contacts: ExternalContact[] } {
  const [, request] = mocks.reconcileContacts.mock.calls[0] as [
    unknown,
    { full: boolean; contacts: ExternalContact[] },
  ];
  return request;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.reconcileContacts.mockResolvedValue({
    writes: [],
    conflicts: [],
    pulled: 0,
    created: 0,
    linked: 0,
  });
});

describe("runContactSync", () => {
  it("never authorises the deletion sweep from an incremental enumeration", async () => {
    // THE test. `full: true` here tells reconcile that every link whose contact
    // did not change this run has been deleted from the address book.
    const page: ChangedContactsPage = {
      mode: "incremental",
      contacts: [CONTACT],
      cursor: "sync-2",
    };
    arrange(connectionRow("sync-1"), page);

    const [result] = await runContactSync("user-1");

    expect(result.error).toBeNull();
    expect(requestSentToReconcile().full).toBe(false);
  });

  it("still authorises it from a full enumeration", async () => {
    // The counterpart, and the reason the test above is not vacuous: deletions
    // must remain detectable on the runs that really did see everything.
    arrange(connectionRow(null), { mode: "full", contacts: [CONTACT], cursor: "sync-1" });

    const [result] = await runContactSync("user-1");

    expect(result.error).toBeNull();
    expect(requestSentToReconcile().full).toBe(true);
  });

  it("resumes from the cursor stored on the connection", async () => {
    // A cursor written but never read would leave every run full and the whole
    // feature inert.
    const target = arrange(connectionRow("sync-1"), {
      mode: "incremental",
      contacts: [],
      cursor: "sync-2",
    });

    await runContactSync("user-1");

    expect(target.listChangedSince).toHaveBeenCalledWith("sync-1");
  });

  it("stores the provider's fresh cursor after a clean run", async () => {
    arrange(connectionRow("sync-1"), { mode: "incremental", contacts: [], cursor: "sync-2" });

    await runContactSync("user-1");

    expect(mocks.recordSyncRun).toHaveBeenCalledWith("conn-1", expect.any(Date), "sync-2");
  });

  it("clears the cursor when a write failed, so the retry is a full run", async () => {
    // applyWrites swallows a per-write failure into a count and the run reports
    // "will retry". That retry only happens if the next run re-observes the
    // contact — which an incremental run would not do.
    mocks.reconcileContacts.mockResolvedValue({
      writes: [{ externalId: "people/c1", contactId: "c1", fields: { name: "Priya" }, etag: null }],
      conflicts: [],
      pulled: 0,
      created: 0,
      linked: 0,
    });
    arrange(
      connectionRow("sync-1"),
      { mode: "incremental", contacts: [CONTACT], cursor: "sync-2" },
      {
        patch: async () => {
          throw new Error("HTTP 429");
        },
      },
    );

    const [result] = await runContactSync("user-1");

    expect(result.error).toMatch(/will retry/);
    expect(mocks.recordSyncRun).toHaveBeenCalledWith("conn-1", expect.any(Date), null);
  });
});
