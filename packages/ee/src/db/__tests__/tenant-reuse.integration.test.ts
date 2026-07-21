import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import { afterAll, describe, expect, it } from "vitest";
import { openTenantConnection } from "../../tenant/scoped-db";
import { openAdminConnection } from "../admin-db";
import { getPool, releaseScoped } from "../pool";

/**
 * Real-Postgres coverage for the connection-reuse change — the part the PGlite
 * unit suite structurally can't reach (single embedded connection, no pool
 * checkout/reuse, no RLS role). Proves against an actual session-pooled
 * database that a released connection carries NO tenant state into its next
 * checkout, and that RLS isolation still holds end-to-end through the
 * reuse-enabled path.
 *
 * Skipped unless DATABASE_URL is set, so it never runs in CI / the unit suite.
 * Needs a SESSION-mode pooler (port 5432) or a direct connection — reuse safety
 * depends on one backend pinned per client (bootstrap.ts enforces this). Run:
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

  it("clears the tenant GUC on the reused backend, without destroying it", async () => {
    // A dedicated max:1 pool makes the next checkout provably the SAME backend,
    // so this isolates exactly what releaseScoped must guarantee.
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
    try {
      const first = await pool.connect();
      await first.query("SELECT set_config('app.current_user_id', $1, false)", [TENANT_A]);
      const { rows: before } = await first.query<SessionRow>(
        "SELECT pg_backend_pid() AS pid, current_setting('app.current_user_id', true) AS uid",
      );
      expect(before[0].uid).toBe(TENANT_A);

      await releaseScoped(first);

      const second = await pool.connect();
      const { rows: after } = await second.query<SessionRow>(
        "SELECT pg_backend_pid() AS pid, current_setting('app.current_user_id', true) AS uid",
      );
      // Same backend => the connection was reused, not destroyed (a regression
      // to release(true) would hand back a fresh pid here).
      expect(after[0].pid).toBe(before[0].pid);
      // ...and it came back clean: no tenant id leaked from the prior checkout.
      expect(after[0].uid).toBe("");
      second.release();
    } finally {
      await pool.end();
    }
  });

  it("keeps a reused connection from leaking admin bypass into a tenant", async () => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
    try {
      const admin = await pool.connect();
      await admin.query("SELECT set_config('app.bypass_rls', 'true', false)");
      await releaseScoped(admin);

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

  it("isolates tenants end-to-end through openTenantConnection (RLS)", async () => {
    const id = randomUUID();

    const a = await openTenantConnection(TENANT_A);
    try {
      await a.db.execute(sql`INSERT INTO contacts (id, name) VALUES (${id}, 'itest')`);
      const mine = await a.db.execute(sql`SELECT count(*)::int AS n FROM contacts WHERE id = ${id}`);
      expect((mine.rows[0] as unknown as CountRow).n).toBe(1);
    } finally {
      await a.release();
    }

    const b = await openTenantConnection(TENANT_B);
    try {
      const theirs = await b.db.execute(sql`SELECT count(*)::int AS n FROM contacts WHERE id = ${id}`);
      // B's checkout — quite possibly A's reused backend — sees none of A's rows.
      expect((theirs.rows[0] as unknown as CountRow).n).toBe(0);
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
