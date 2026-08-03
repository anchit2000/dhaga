import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openTenantConnection } from "../../tenant/scoped-db";
import { openAdminConnection } from "../admin-db";
import { getPool } from "../pool";
import type { SQL } from "drizzle-orm";

/**
 * Real-Postgres proof that RLS actually ISOLATES every tenant table at runtime —
 * the property the PGlite unit suite structurally can't reach (PGlite has no
 * row-level security). DDL "looking right" is not the policy denying a second
 * tenant's read; this asserts the deny, per table. For each TENANT_TABLES member
 * (rls-ddl.ts): admin (bypass) confirms A's row exists (so a failed insert can't
 * pass vacuously — Rule 9); B's scoped read sees 0 of it; A still sees its own
 * row with `user_id` auto-stamped from `current_setting('app.current_user_id')`,
 * never supplied by the INSERT — the whole point of the column DEFAULT. A runtime
 * guard cross-checks coverage against the live `tenant_isolation` policies, so a
 * new TENANT_TABLES entry fails this suite until a spec is added.
 *
 * Skipped unless DATABASE_URL is set — same harness as
 * tenant-reuse.integration.test.ts (openTenantConnection / openAdminConnection
 * both ensure the EE schema; the shared pool is closed in afterAll). Run:
 *   cd packages/ee
 *   node --env-file=../../apps/web/.env.vercel \
 *     ../../node_modules/vitest/vitest.mjs run src/db/__tests__/rls-isolation.integration.test.ts
 */
const RUN = Boolean(process.env.DATABASE_URL);

// Clearly-fake tenant ids, disjoint from any real user, so cleanup by user_id
// can never touch production rows.
const TENANT_A = "rls-test-user-a";
const TENANT_B = "rls-test-user-b";

// Every id/owner is namespaced by a fresh run id so a crashed prior run leaves
// no PK collision here (leftover rows are still swept by cleanup-on-user_id).
const RUN_ID = randomUUID();
const rid = (table: string): string => `rls-test-${RUN_ID}-${table}`;

// FK parents referenced by dependent specs below.
const CONTACT = rid("contacts");
const EVENT = rid("events");
const NOTE = rid("notes");
const NODE_TYPE = rid("node_types");
// embeddings has no id column (PK is owner_type/owner_id) — identify by owner_id.
const EMB_OWNER = rid("embeddings-owner");
// A minimal valid pgvector(384) literal for the embeddings NOT NULL column.
const EMBEDDING = `[${new Array(384).fill(0).join(",")}]`;

interface TableSpec {
  /** Tenant table under test (a member of rls-ddl.ts's TENANT_TABLES). */
  table: string;
  /** Minimal INSERT for one row — NEVER lists user_id (that must auto-stamp). */
  insert: SQL;
  /** WHERE fragment that uniquely locates that one row. */
  where: SQL;
}

/**
 * One insertable row per tenant table, in FK-dependency order (parents first) so
 * the whole set inserts inside one tenant transaction and deletes in reverse.
 * Tables with hard FKs are driven through their natural parent (the contact /
 * event / node-type / note created earlier in this same list). No table is
 * skipped — every TENANT_TABLES member is reachable with a bare parent-satisfied
 * insert.
 */
const SPECS: readonly TableSpec[] = [
  {
    table: "companies",
    insert: sql`INSERT INTO companies (id, name) VALUES (${rid("companies")}, 'rls-test')`,
    where: sql`id = ${rid("companies")}`,
  },
  {
    table: "node_types",
    insert: sql`INSERT INTO node_types (id, name, slug, color) VALUES (${NODE_TYPE}, 'rls-test', 'rls-test', '#ffffff')`,
    where: sql`id = ${NODE_TYPE}`,
  },
  {
    table: "events",
    insert: sql`INSERT INTO events (id, name) VALUES (${EVENT}, 'rls-test')`,
    where: sql`id = ${EVENT}`,
  },
  {
    table: "contacts",
    insert: sql`INSERT INTO contacts (id, name) VALUES (${CONTACT}, 'rls-test')`,
    where: sql`id = ${CONTACT}`,
  },
  {
    table: "entities",
    insert: sql`INSERT INTO entities (id, type_id, name) VALUES (${rid("entities")}, ${NODE_TYPE}, 'rls-test')`,
    where: sql`id = ${rid("entities")}`,
  },
  {
    table: "notes",
    insert: sql`INSERT INTO notes (id, contact_id, kind, body) VALUES (${NOTE}, ${CONTACT}, 'manual', 'rls-test')`,
    where: sql`id = ${NOTE}`,
  },
  {
    table: "event_contacts",
    insert: sql`INSERT INTO event_contacts (event_id, contact_id) VALUES (${EVENT}, ${CONTACT})`,
    where: sql`event_id = ${EVENT} AND contact_id = ${CONTACT}`,
  },
  {
    table: "facts",
    insert: sql`INSERT INTO facts (id, contact_id, type, text, confidence) VALUES (${rid("facts")}, ${CONTACT}, 'role', 'rls-test', 0.9)`,
    where: sql`id = ${rid("facts")}`,
  },
  {
    table: "edges",
    insert: sql`INSERT INTO edges (id, src_type, src_id, predicate, dst_type, dst_id) VALUES (${rid("edges")}, 'contact', ${CONTACT}, 'rls_test', 'contact', ${CONTACT})`,
    where: sql`id = ${rid("edges")}`,
  },
  {
    table: "edge_suggestions",
    insert: sql`INSERT INTO edge_suggestions (id, src_contact_id, predicate, object_name, object_type) VALUES (${rid("edge_suggestions")}, ${CONTACT}, 'knows', 'Someone', 'contact')`,
    where: sql`id = ${rid("edge_suggestions")}`,
  },
  {
    table: "confirmations",
    insert: sql`INSERT INTO confirmations (id, type) VALUES (${rid("confirmations")}, 'entity_link')`,
    where: sql`id = ${rid("confirmations")}`,
  },
  {
    table: "follow_ups",
    insert: sql`INSERT INTO follow_ups (id, contact_id, action) VALUES (${rid("follow_ups")}, ${CONTACT}, 'rls-test')`,
    where: sql`id = ${rid("follow_ups")}`,
  },
  {
    table: "embeddings",
    insert: sql`INSERT INTO embeddings (owner_type, owner_id, contact_id, content, embedding) VALUES ('note', ${EMB_OWNER}, ${CONTACT}, 'rls-test', ${EMBEDDING}::vector)`,
    where: sql`owner_id = ${EMB_OWNER}`,
  },
  {
    table: "card_images",
    insert: sql`INSERT INTO card_images (id, contact_id, media_type, data_base64) VALUES (${rid("card_images")}, ${CONTACT}, 'image/png', 'AAAA')`,
    where: sql`id = ${rid("card_images")}`,
  },
  {
    table: "ai_actions",
    insert: sql`INSERT INTO ai_actions (id, feature, model, input_tokens, output_tokens) VALUES (${rid("ai_actions")}, 'rls-test', 'test-model', 1, 1)`,
    where: sql`id = ${rid("ai_actions")}`,
  },
  {
    table: "signals",
    insert: sql`INSERT INTO signals (id, contact_id, kind, headline, detail, status) VALUES (${rid("signals")}, ${CONTACT}, 'news', 'rls-test', 'rls-test', 'new')`,
    where: sql`id = ${rid("signals")}`,
  },
  {
    table: "extraction_jobs",
    insert: sql`INSERT INTO extraction_jobs (id, contact_id, kind) VALUES (${rid("extraction_jobs")}, ${CONTACT}, 'note')`,
    where: sql`id = ${rid("extraction_jobs")}`,
  },
  {
    table: "calendar_connections",
    insert: sql`INSERT INTO calendar_connections (id, provider, access_token) VALUES (${rid("calendar_connections")}, 'google', 'rls-test')`,
    where: sql`id = ${rid("calendar_connections")}`,
  },
  {
    table: "positions",
    insert: sql`INSERT INTO positions (id, contact_id) VALUES (${rid("positions")}, ${CONTACT})`,
    where: sql`id = ${rid("positions")}`,
  },
  {
    table: "relationship_types",
    insert: sql`INSERT INTO relationship_types (id, slug, forward_label, inverse_label) VALUES (${rid("relationship_types")}, 'rls-test', 'reports to', 'manages')`,
    where: sql`id = ${rid("relationship_types")}`,
  },
  {
    table: "graph_layouts",
    insert: sql`INSERT INTO graph_layouts (id, graph_hash, positions) VALUES (${rid("graph_layouts")}, 'rls-test', '{}'::jsonb)`,
    where: sql`id = ${rid("graph_layouts")}`,
  },
  {
    table: "voice_vocab",
    insert: sql`INSERT INTO voice_vocab (id, term, term_lc) VALUES (${rid("voice_vocab")}, 'rls-test', 'rls-test')`,
    where: sql`id = ${rid("voice_vocab")}`,
  },
  {
    table: "feedback",
    insert: sql`INSERT INTO feedback (id, message, route) VALUES (${rid("feedback")}, 'rls-test', '/app')`,
    where: sql`id = ${rid("feedback")}`,
  },
] as const;

interface CountRow {
  n: number;
}
interface OwnedRow {
  n: number;
  uid: string | null;
}

/** Count matching rows through a tenant's own scoped (RLS) connection. */
async function scopedCount(userId: string, spec: TableSpec): Promise<number> {
  const conn = await openTenantConnection(userId);
  try {
    return await conn.run(async (db) => {
      const res = await db.execute(
        sql`SELECT count(*)::int AS n FROM ${sql.raw(spec.table)} WHERE ${spec.where}`,
      );
      return (res.rows[0] as unknown as CountRow).n;
    });
  } finally {
    await conn.release();
  }
}

/** Owner's view of its row: count + the stamped user_id, in one scoped query. */
async function ownedRow(userId: string, spec: TableSpec): Promise<OwnedRow> {
  const conn = await openTenantConnection(userId);
  try {
    return await conn.run(async (db) => {
      const res = await db.execute(
        sql`SELECT count(*)::int AS n, max(user_id) AS uid FROM ${sql.raw(spec.table)} WHERE ${spec.where}`,
      );
      return res.rows[0] as unknown as OwnedRow;
    });
  } finally {
    await conn.release();
  }
}

/** Ground-truth count with RLS bypassed — did the row physically land at all? */
async function adminCount(spec: TableSpec): Promise<number> {
  const admin = await openAdminConnection();
  try {
    const res = await admin.db.execute(
      sql`SELECT count(*)::int AS n FROM ${sql.raw(spec.table)} WHERE ${spec.where}`,
    );
    return (res.rows[0] as unknown as CountRow).n;
  } finally {
    await admin.release();
  }
}

/**
 * Remove every row these fake tenants could own, children before parents. Run
 * before inserting (sweep a crashed prior run — e.g. graph_layouts' UNIQUE
 * (user_id, key) would otherwise collide) and again after, so the suite is
 * repeatable. Bypass RLS so the delete actually reaches the rows.
 */
async function cleanup(): Promise<void> {
  const admin = await openAdminConnection();
  try {
    for (const spec of [...SPECS].reverse()) {
      await admin.db.execute(
        sql`DELETE FROM ${sql.raw(spec.table)} WHERE user_id IN (${TENANT_A}, ${TENANT_B})`,
      );
    }
  } finally {
    await admin.release();
  }
}

describe.skipIf(!RUN)("RLS isolates every tenant table (integration)", () => {
  beforeAll(async () => {
    await cleanup();
    // Insert one row into every tenant table as A, in one scoped transaction so
    // FK parents exist for their children and every user_id auto-stamps to A.
    const a = await openTenantConnection(TENANT_A);
    try {
      await a.run(async (db) => {
        for (const spec of SPECS) {
          await db.execute(spec.insert);
        }
      });
    } finally {
      await a.release();
    }
  });

  afterAll(async () => {
    try {
      await cleanup();
    } catch {
      // best effort — the assertions, not cleanup, are what this suite verifies
    }
    await getPool().end();
  });

  it("covers exactly the tables the live DB actually protects with tenant_isolation", async () => {
    // The authoritative TENANT_TABLES const isn't exported from rls-ddl.ts, so
    // cross-check against the live policies its DDL created instead — a stronger
    // check anyway (it proves the DDL took effect, not just that a list matches).
    // Every `tenant_isolation` policy in this DB comes from rls-ddl.ts, which
    // policies exactly TENANT_TABLES plus `settings` (RLS'd there separately, with
    // its own compound (user_id, key) PK — intentionally not in the SPECS loop).
    // So a new TENANT_TABLES entry mints a policy that lands here and fails this
    // test until a spec is added — coverage can't silently drift.
    const admin = await openAdminConnection();
    try {
      const policies = await admin.db.execute(
        sql`SELECT tablename FROM pg_policies WHERE schemaname = 'public' AND policyname = 'tenant_isolation'`,
      );
      const policied = policies.rows.map((r) => (r as unknown as { tablename: string }).tablename);
      // ...and each protected table must actually FORCE row security, or the
      // owner (which core connects as) would bypass its own policy silently.
      const rowsec = await admin.db.execute(
        sql`SELECT relname FROM pg_class
            WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'
              AND relrowsecurity AND relforcerowsecurity`,
      );
      const forced = new Set(rowsec.rows.map((r) => (r as unknown as { relname: string }).relname));

      const covered = new Set(SPECS.map((s) => s.table));
      // settings is tenant-scoped too but handled outside the SPECS loop; include
      // it so the two sets line up exactly.
      expect(new Set([...covered, "settings"])).toEqual(new Set(policied));
      for (const table of covered) {
        expect(forced.has(table), `${table}: RLS is not FORCE-enabled at runtime`).toBe(true);
      }
    } finally {
      await admin.release();
    }
  });

  it.each(SPECS)(
    "isolates $table: B sees none of A's row, A sees its own, user_id auto-stamped",
    async (spec) => {
      // Ground truth: the row physically exists (guards against a vacuous pass on
      // a silently-failed insert).
      expect(await adminCount(spec), `${spec.table}: A's row was never written`).toBe(1);

      // Isolation: a different tenant's scoped read returns none of it.
      expect(await scopedCount(TENANT_B, spec), `${spec.table}: leaked to tenant B`).toBe(0);

      // Owner still sees exactly its own row...
      const owned = await ownedRow(TENANT_A, spec);
      expect(owned.n, `${spec.table}: owner lost sight of its own row`).toBe(1);
      // ...and user_id was stamped from the GUC default, not supplied by the insert.
      expect(owned.uid, `${spec.table}: user_id not auto-stamped from app.current_user_id`).toBe(
        TENANT_A,
      );
    },
  );
});
