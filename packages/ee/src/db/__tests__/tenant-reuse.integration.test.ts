import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { openTenantConnection } from "../../tenant/scoped-db";
import { openAdminConnection } from "../admin-db";
import { getPool, releaseScoped } from "../pool";

/**
 * Real-Postgres coverage for the transaction-scoped design — the part the
 * PGlite unit suite structurally can't reach (a real pool checkout/reuse, a
 * real RLS role, real transaction-local GUC semantics). Proves the safety
 * property that matters: a connection REUSED for another checkout cannot carry
 * one tenant's scope into another's, because each scope's GUC is transaction-
 * local and vanishes at COMMIT — with NO `RESET ALL` in the release path, so
 * the same code is safe on a session pooler (5432) and a transaction pooler
 * (6543) alike.
 *
 * Skipped unless DATABASE_URL is set, so it never runs in CI / the unit suite.
 * A session-mode pooler (5432) or a direct connection lets the max:1 tests
 * observe the same backend on the next checkout; on a transaction pooler the
 * reuse is equally safe but pids may differ. Run:
 *   cd packages/ee
 *   node --env-file=../../apps/web/.env.vercel \
 *     ../../node_modules/vitest/vitest.mjs run src/db/__tests__/tenant-reuse.integration.test.ts
 */
const RUN = Boolean(process.env.DATABASE_URL);
const TENANT_A = "itest-user-a";
const TENANT_B = "itest-user-b";

interface CountRow {
  n: number;
}
interface SessionRow {
  pid: number;
  uid: string;
}

describe.skipIf(!RUN)("tenant connection reuse (integration)", () => {
  afterAll(async () => {
    // Belt-and-suspenders: drop any synthetic rows a failed run may have left,
    // then close the shared pool so the process can exit.
    try {
      const admin = await openAdminConnection();
      try {
        await admin.db.execute(
          sql`DELETE FROM contacts WHERE user_id IN (${TENANT_A}, ${TENANT_B})`,
        );
      } finally {
        await admin.release();
      }
    } catch {
      // best effort — the assertions, not cleanup, are what this suite verifies
    }
    await getPool().end();
  });

  it("a reused backend carries no tenant scope from the prior transaction", async () => {
    // A dedicated max:1 pool makes the next checkout provably the SAME backend,
    // so this isolates exactly what transaction-local scoping must guarantee.
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
    try {
      const first = await pool.connect();
      // One scope's transaction, its tenant GUC set transaction-local.
      await first.query("BEGIN");
      await first.query("SELECT set_config('app.current_user_id', $1, true)", [TENANT_A]);
      const { rows: within } = await first.query<SessionRow>(
        "SELECT pg_backend_pid() AS pid, current_setting('app.current_user_id', true) AS uid",
      );
      expect(within[0].uid).toBe(TENANT_A); // scoped inside its own transaction
      await first.query("COMMIT"); // transaction-local setting is discarded here
      releaseScoped(first); // returned to the pool CLEAN — no RESET ALL

      const second = await pool.connect();
      const { rows: after } = await second.query<SessionRow>(
        "SELECT pg_backend_pid() AS pid, current_setting('app.current_user_id', true) AS uid",
      );
      // Same backend => the connection was reused, not destroyed (a regression
      // to release(true) would hand back a fresh pid here).
      expect(after[0].pid).toBe(within[0].pid);
      // ...and it came back clean: the prior tenant's scope did not leak.
      expect(after[0].uid).toBe("");
      second.release();
    } finally {
      await pool.end();
    }
  });

  it("a reused backend carries no admin bypass into the next checkout", async () => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
    try {
      const admin = await pool.connect();
      await admin.query("BEGIN");
      await admin.query("SELECT set_config('app.bypass_rls', 'true', true)");
      await admin.query("COMMIT"); // transaction-local bypass is discarded here
      releaseScoped(admin);

      const tenant = await pool.connect();
      const { rows } = await tenant.query<{ bypass: string }>(
        "SELECT current_setting('app.bypass_rls', true) AS bypass",
      );
      // If bypass_rls survived reuse, a tenant checkout would silently see every
      // tenant's rows — the exact cross-tenant leak reuse must not introduce.
      expect(rows[0].bypass).toBe("");
      tenant.release();
    } finally {
      await pool.end();
    }
  });

  it("rolls back on error and hands a clean, correctly-scoped connection to the next scope", async () => {
    // A failing unit of work must ROLLBACK and leave NO open transaction on the
    // pooled connection — the next checkout must be usable and see only its own
    // tenant. Uses the real openTenantConnection (shared pool).
    const failing = await openTenantConnection(TENANT_A);
    try {
      await expect(
        failing.run(async () => {
          throw new Error("boom");
        }),
      ).rejects.toThrow("boom");
    } finally {
      await failing.release();
    }

    const next = await openTenantConnection(TENANT_B);
    try {
      const uid = await next.run(async (db) => {
        const res = await db.execute(
          sql`SELECT current_setting('app.current_user_id', true) AS uid`,
        );
        return (res.rows[0] as unknown as { uid: string }).uid;
      });
      // No dangling transaction from the rollback, and the fresh scope is
      // correctly bound to TENANT_B — not carrying TENANT_A or an aborted txn.
      expect(uid).toBe(TENANT_B);
    } finally {
      await next.release();
    }
  });

  it("isolates tenants end-to-end through openTenantConnection (RLS)", async () => {
    const id = randomUUID();

    const a = await openTenantConnection(TENANT_A);
    try {
      await a.run(async (db) => {
        await db.execute(sql`INSERT INTO contacts (id, name) VALUES (${id}, 'itest')`);
        const mine = await db.execute(sql`SELECT count(*)::int AS n FROM contacts WHERE id = ${id}`);
        expect((mine.rows[0] as unknown as CountRow).n).toBe(1);
      });
    } finally {
      await a.release();
    }

    const b = await openTenantConnection(TENANT_B);
    try {
      await b.run(async (db) => {
        const theirs = await db.execute(sql`SELECT count(*)::int AS n FROM contacts WHERE id = ${id}`);
        // B's checkout — quite possibly A's reused backend — sees none of A's rows.
        expect((theirs.rows[0] as unknown as CountRow).n).toBe(0);
      });
    } finally {
      await b.release();
    }

    const admin = await openAdminConnection();
    try {
      await admin.db.execute(sql`DELETE FROM contacts WHERE id = ${id}`);
    } finally {
      await admin.release();
    }
  });
});
