import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";
import { releaseScoped } from "../pool";

/**
 * A connection reused for another checkout must not leak one tenant's scope
 * into another's. Under the transaction-scoped design that safety no longer
 * comes from a reset on release: each scope sets its `app.*` GUC transaction-
 * LOCAL (`is_local = true`) inside its own BEGIN…COMMIT, so the setting is
 * discarded the instant that transaction ends (see tenant/scoped-db.ts and
 * admin-db.ts). releaseScoped therefore only hands the physical connection
 * back — and MUST NOT issue a session-level `RESET ALL`, which is both
 * unnecessary here and unsafe on a transaction-mode pooler (a session command
 * run between transactions can land on a different backend than the scope ran
 * on). These tests fail exactly when either property regresses.
 */
describe("releaseScoped", () => {
  it("returns the connection to the pool for reuse, issuing no session reset", () => {
    const query = vi.fn();
    const release = vi.fn();

    releaseScoped({ query, release } as unknown as PoolClient);

    // Reuse (plain release), not destroy (release(true)).
    expect(release).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledWith();
    // The regression that matters: no `RESET ALL` — no query at all on release.
    // A session reset between transactions is exactly what breaks on the
    // transaction pooler, so re-introducing one here must fail this test.
    expect(query).not.toHaveBeenCalled();
  });

  it("destroys the connection instead of reusing it when a clean release fails", () => {
    const release = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new Error("socket already gone");
      });

    releaseScoped({ query: vi.fn(), release } as unknown as PoolClient);

    // A connection that can't be cleanly released may be in an unknown state,
    // so it is discarded — release(true) — never returned to the pool.
    expect(release).toHaveBeenCalledTimes(2);
    expect(release).toHaveBeenLastCalledWith(true);
  });
});
