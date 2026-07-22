import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";
import { releaseScoped } from "../pool";

/**
 * releaseScoped returns tenant/admin-scoped connections to the pool for REUSE
 * instead of destroying them (the churn a tiny pool would otherwise pay on
 * every request). The safety of that reuse rests on one invariant: the
 * session-level `app.*` GUCs a checkout set — `app.current_user_id` for a
 * tenant, `app.bypass_rls` for admin — MUST be gone before the connection is
 * handed out again. A stale setting on a reused connection is a silent
 * cross-tenant data leak, not a crash (see rls-ddl.ts's tenant_isolation
 * policy). These tests fail exactly when that protection regresses.
 *
 * `RESET ALL` clears every customized session GUC regardless of which path set
 * it (verified against real Postgres semantics), so it — not a narrower
 * `RESET app.current_user_id` that would miss admin's `app.bypass_rls` — is the
 * command required here.
 */
describe("releaseScoped", () => {
  it("clears session state with RESET ALL, THEN returns the connection to the pool", async () => {
    const order: string[] = [];
    const query = vi.fn(async (sql: string) => {
      order.push(sql);
      return { rows: [] };
    });
    const release = vi.fn(() => order.push("release"));

    await releaseScoped({ query, release } as unknown as PoolClient);

    // The exact command matters: a narrower reset would leave admin's
    // app.bypass_rls set on a connection later reused by a tenant.
    expect(query).toHaveBeenCalledWith("RESET ALL");
    // Ordering matters: a client released before the reset completes could be
    // checked out again still carrying the previous tenant's GUC.
    expect(order).toEqual(["RESET ALL", "release"]);
    // Reuse (plain release), not destroy (release(true)).
    expect(release).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledWith();
  });

  it("destroys the connection instead of reusing it when the reset fails", async () => {
    const query = vi.fn(async () => {
      throw new Error("connection reset by peer");
    });
    const release = vi.fn();

    await releaseScoped({ query, release } as unknown as PoolClient);

    // A connection whose reset failed may still carry the tenant GUC, so it
    // must be discarded — release(true) — never returned to the pool clean.
    expect(release).toHaveBeenCalledWith(true);
  });
});
