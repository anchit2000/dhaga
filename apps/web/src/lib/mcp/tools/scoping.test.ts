import type { AuthInfo, McpServer, ToolCallback } from "@modelcontextprotocol/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerDhagaTools } from "../index";

/**
 * Tool handlers get their tenant from the verified token and from nowhere
 * else. Every read and write below runs against a real user's private graph,
 * so if a handler ever resolves the wrong user — or none — one person's client
 * reads another person's contacts. These cases pin that wiring, plus the two
 * behaviours a connected model depends on to answer honestly.
 *
 * vi.mock is hoisted above these imports, so every mock handle is
 * `mock`-prefixed to be hoisted with it.
 */

const mockScopes: string[] = [];
vi.mock("@/lib/db/request-scope", () => ({
  // Records which tenant each call was scoped to, then runs the work.
  withUserDb: async <T>(userId: string, work: () => Promise<T>) => {
    mockScopes.push(userId);
    return work();
  },
}));

const mockHybridSearch = vi.fn();
vi.mock("@/lib/repo/search", () => ({ hybridSearch: () => mockHybridSearch() }));

const mockAddNote = vi.fn();
vi.mock("@/lib/repo/notes", () => ({
  addNote: (...args: unknown[]) => mockAddNote(...args),
  listFacts: async () => [],
  listNotes: async () => [],
  listOpenFollowUps: async () => [],
  setFollowUpStatus: async () => undefined,
}));

const mockCreateExtractionJob = vi.fn();
vi.mock("@/lib/repo/extraction-jobs", () => ({
  createExtractionJob: (...args: unknown[]) => mockCreateExtractionJob(...args),
}));

const mockHasBudget = vi.fn();
vi.mock("@/lib/ai/metering", () => ({ hasMonthlyAiBudget: () => mockHasBudget() }));

vi.mock("@/lib/repo/contacts", () => ({
  getContact: async () => null,
  listContactsPage: async () => ({ rows: [], total: 0 }),
  createContact: async () => "contact-new",
}));
vi.mock("@/lib/repo/reminders", () => ({
  listAllOpenFollowUps: async () => [],
  listUpcomingImportantDates: async () => [],
}));
vi.mock("@/lib/repo/warm-paths", () => ({ findWarmPaths: async () => [] }));
vi.mock("@/lib/repo/manual-entries", () => ({ addFollowUp: async () => "fu-new" }));

/** Grabs the registered callbacks so they can be invoked directly. */
function toolCallbacks(): Map<string, ToolCallback<never>> {
  const callbacks = new Map<string, ToolCallback<never>>();
  const recorder = {
    registerTool(name: string, _config: unknown, cb: ToolCallback<never>) {
      callbacks.set(name, cb);
    },
  };
  registerDhagaTools(recorder as unknown as McpServer);
  return callbacks;
}

function ctxFor(userId: string): { http: { authInfo: AuthInfo } } {
  return {
    http: { authInfo: { token: "t", clientId: "c", scopes: [], extra: { userId } } },
  };
}

/** Invokes a tool the way the SDK does, tolerating both callback arities. */
async function callTool(name: string, args: object, userId: string): Promise<string> {
  const cb = toolCallbacks().get(name);
  if (!cb) throw new Error(`${name} is not registered`);
  const invoke = cb as unknown as (...a: unknown[]) => Promise<{ content: { text: string }[] }>;
  const ctx = ctxFor(userId);
  // Tools with no inputSchema take only the context; the rest take (args, ctx).
  const result = await (invoke.length <= 1 ? invoke(ctx) : invoke(args, ctx));
  return result.content.map((block) => block.text).join("\n");
}

beforeEach(() => {
  mockScopes.length = 0;
  mockHybridSearch.mockReset().mockResolvedValue([]);
  mockAddNote.mockReset().mockResolvedValue("note-1");
  mockCreateExtractionJob.mockReset().mockResolvedValue("job-1");
  mockHasBudget.mockReset().mockResolvedValue(true);
});

describe("tenant scoping", () => {
  it("scopes a read to the user the token resolved to", async () => {
    await callTool("dhaga_search", { query: "priya" }, "user-a");
    expect(mockScopes).toEqual(["user-a"]);
  });

  it("scopes a write to the user the token resolved to", async () => {
    await callTool("dhaga_add_note", { contactId: "c1", body: "met at KubeCon" }, "user-b");
    expect(mockScopes).toEqual(["user-b"]);
  });

  it("never carries one caller's tenant into the next call", async () => {
    // Two clients hit the same warm server back to back. The scope has to come
    // from each request's own token, not from module state left by the last one.
    await callTool("dhaga_search", { query: "x" }, "user-a");
    await callTool("dhaga_search", { query: "x" }, "user-b");
    expect(mockScopes).toEqual(["user-a", "user-b"]);
  });

  it("refuses to run a tool whose token carried no user", async () => {
    const cb = toolCallbacks().get("dhaga_search");
    const invoke = cb as unknown as (...a: unknown[]) => Promise<unknown>;
    // No authInfo at all — the failure must be a throw, not a call that runs on
    // whatever database scope happens to be ambient.
    await expect(invoke({ query: "x" }, { http: {} })).rejects.toThrow();
    expect(mockScopes).toEqual([]);
  });
});

describe("answering honestly", () => {
  it("says nothing matched instead of returning a bare empty list", async () => {
    // A model handed `[]` reads it as a tool failure and retries or guesses. An
    // explicit sentence is what lets it tell the user "you don't know anyone
    // called that" — the same anti-fabrication guarantee Ask Dhaga makes.
    const text = await callTool("dhaga_search", { query: "Nobody Here" }, "user-a");
    expect(text).toContain("Nobody Here");
    expect(text).not.toBe("[]");
  });

  it("keeps the note but skips extraction when the user is out of credits", async () => {
    // Losing what the user dictated because their monthly cap ran out would be
    // the worst possible failure here. The note is saved either way; only the
    // paid extraction step is dropped, and the client is told so plainly.
    mockHasBudget.mockResolvedValue(false);

    const text = await callTool("dhaga_add_note", { contactId: "c1", body: "hi" }, "user-a");

    expect(mockAddNote).toHaveBeenCalledWith("c1", "text", "hi");
    expect(mockCreateExtractionJob).not.toHaveBeenCalled();
    expect(text).toContain("AI credits");
  });

  it("queues extraction so derived facts keep a receipt when credits remain", async () => {
    // Facts and follow-ups must trace back to the note that produced them, or
    // deleting the note can no longer tombstone what it created.
    await callTool("dhaga_add_note", { contactId: "c1", body: "hi" }, "user-a");
    expect(mockCreateExtractionJob).toHaveBeenCalledWith({
      contactId: "c1",
      kind: "note_extraction",
      noteId: "note-1",
    });
  });
});
