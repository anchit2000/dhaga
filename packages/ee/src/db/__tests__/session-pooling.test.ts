import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tenant scoping is TRANSACTION-scoped: each unit of work runs inside one
 * BEGIN…COMMIT whose first statement sets `app.current_user_id` as a
 * transaction-LOCAL setting (`is_local = true`, a bound parameter — never
 * string-interpolated). Because the setting is transaction-local it is
 * discarded at COMMIT/ROLLBACK, so a connection reused for a second tenant
 * cannot carry the first tenant's scope — the isolation the old session-level
 * set_config + RESET-ALL design bought, now WITHOUT a session reset (which a
 * transaction-mode pooler cannot run safely) and therefore correct on both the
 * session pooler (5432) and the transaction pooler (6543).
 *
 * These are driven by a fake pg client (real drizzle on top of it), so they run
 * with no live database. They fail exactly when openTenantConnection stops
 * wrapping work in a transaction, stops setting the tenant GUC transaction-
 * local, commits when it should roll back, or re-introduces a session reset.
 */

interface QueryCall {
  text: string;
  values: unknown[];
}

const holder = vi.hoisted(() => ({
  client: undefined as
    | { calls: QueryCall[]; query: ReturnType<typeof vi.fn>; release: ReturnType<typeof vi.fn> }
    | undefined,
}));

vi.mock("../connect-retry", () => ({
  connectWithRetry: vi.fn(async () => holder.client),
}));
vi.mock("../bootstrap", () => ({
  ensureEeSchema: vi.fn(async () => {}),
}));
vi.mock("../pool", () => ({
  getPool: vi.fn(() => ({})),
  // Mirror the real releaseScoped (plain release, no query) so the tests can
  // assert reuse without a session reset.
  releaseScoped: vi.fn((client: { release: () => void }) => client.release()),
}));

// Imported after the mocks (vi.mock is hoisted above imports).
import { openTenantConnection } from "../../tenant/scoped-db";

function makeFakeClient() {
  const calls: QueryCall[] = [];
  return {
    calls,
    query: vi.fn((cfg: unknown, values?: unknown) => {
      const text = typeof cfg === "string" ? cfg : (cfg as { text: string }).text;
      calls.push({ text, values: (values as unknown[]) ?? [] });
      return Promise.resolve({ rows: [], rowCount: 0 });
    }),
    release: vi.fn(),
  };
}

const texts = (): string[] => (holder.client?.calls ?? []).map((c) => c.text.trim().toLowerCase());
const indexOfIncluding = (needle: string): number => texts().findIndex((t) => t.includes(needle));

describe("openTenantConnection — transaction-scoped tenant isolation", () => {
  beforeEach(() => {
    holder.client = makeFakeClient();
    vi.clearAllMocks();
  });

  it("runs work inside a transaction: BEGIN → transaction-local set_config(userId) → COMMIT", async () => {
    const scoped = await openTenantConnection("user-a");
    const result = await scoped.run(async () => "done");
    expect(result).toBe("done");

    // Ordering: the tenant GUC is set AFTER begin and BEFORE commit — i.e. it is
    // the scope's own transaction that carries it, not the ambient session.
    const begin = indexOfIncluding("begin");
    const setConfig = indexOfIncluding("set_config");
    const commit = indexOfIncluding("commit");
    expect(begin).toBeGreaterThanOrEqual(0);
    expect(setConfig).toBeGreaterThan(begin);
    expect(commit).toBeGreaterThan(setConfig);
    expect(indexOfIncluding("rollback")).toBe(-1);

    const setCall = holder.client!.calls.find((c) => c.text.includes("set_config"))!;
    // Bound parameter (not interpolated) and is_local = true (the 3rd arg) —
    // that `true` is what makes the setting vanish at COMMIT.
    expect(setCall.text).toMatch(/set_config\('app\.current_user_id',\s*\$1,\s*true\)/);
    expect(setCall.values).toEqual(["user-a"]);

    // Never a session-level reset — the whole point of transaction scoping.
    expect(texts().some((t) => t.includes("reset all"))).toBe(false);
  });

  it("rolls back — never commits — when the work throws", async () => {
    const scoped = await openTenantConnection("user-a");
    await expect(
      scoped.run(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(indexOfIncluding("begin")).toBeGreaterThanOrEqual(0);
    expect(indexOfIncluding("rollback")).toBeGreaterThan(-1);
    expect(indexOfIncluding("commit")).toBe(-1);
  });

  it("release() reuses the connection (no session reset)", async () => {
    const scoped = await openTenantConnection("user-a");
    await scoped.run(async () => "x");
    await scoped.release();

    expect(holder.client!.release).toHaveBeenCalledWith();
    expect(texts().some((t) => t.includes("reset all"))).toBe(false);
  });

  it("begin() holds the tenant transaction open until release() commits it", async () => {
    const scoped = await openTenantConnection("user-a");
    await scoped.begin();

    // Opened and scoped, but NOT yet committed — the render still needs the db.
    expect(texts()).toEqual(["begin", "select set_config('app.current_user_id', $1, true)"]);

    await scoped.release();
    // release() commits the held transaction and never issues a session reset.
    expect(texts()[texts().length - 1]).toBe("commit");
    expect(texts().some((t) => t.includes("reset all"))).toBe(false);
  });
});
