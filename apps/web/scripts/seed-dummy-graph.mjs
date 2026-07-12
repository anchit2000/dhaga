#!/usr/bin/env node
/**
 * Seeds (or removes) exactly one dummy, RLS-scoped account with synthetic
 * contacts/companies/edges, for load-testing /app/graph and /app/people
 * rendering at scale. Every row this script writes carries user_id = the
 * dummy account's id, and every write/delete runs with
 * app.current_user_id set to that same id — Postgres RLS (packages/ee's
 * tenant_isolation policy) then makes it structurally impossible for this
 * script to read or touch any other tenant's rows, no matter the row count.
 *
 * Usage (from apps/web):
 *   node --env-file=.env.vercel scripts/seed-dummy-graph.mjs create [--contacts=1000]
 *   node --env-file=.env.vercel scripts/seed-dummy-graph.mjs delete
 *   node --env-file=.env.vercel scripts/seed-dummy-graph.mjs recreate [--contacts=1000]
 *
 * Deliberately raw `pg` + `better-auth/crypto`, no drizzle/schema import:
 * a throwaway seed script has no reason to pull in the app's ORM wiring,
 * and `hashPassword` is the same function better-auth's own signup path
 * uses, so the account can log in through the normal email/password form.
 */
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { hashPassword } from "better-auth/crypto";

const DUMMY_USER_ID = "dummy-loadtest-user";
const DUMMY_EMAIL = "loadtest@dhaga.internal";
const DUMMY_NAME = "Dummy Load Test";
const DUMMY_PASSWORD = "LoadTest-Dummy-2026!";

const EDGE_PREDICATES = ["knows", "introduced_by", "worked_with"];

function parseArgs(argv) {
  const command = argv[2];
  const contactsFlag = argv.find((arg) => arg.startsWith("--contacts="));
  const contacts = contactsFlag ? Number(contactsFlag.split("=")[1]) : 1000;
  if (!["create", "delete", "recreate"].includes(command)) {
    console.error("Usage: seed-dummy-graph.mjs <create|delete|recreate> [--contacts=N]");
    process.exit(1);
  }
  if (!Number.isInteger(contacts) || contacts < 1) {
    console.error("--contacts must be a positive integer");
    process.exit(1);
  }
  return { command, contacts };
}

function chunk(rows, size) {
  const chunks = [];
  for (let i = 0; i < rows.length; i += size) chunks.push(rows.slice(i, i + size));
  return chunks;
}

/** Builds a `($1,$2,...),($n,...)` multi-row VALUES clause for `rowsOfValues`. */
function buildValuesClause(rowsOfValues) {
  const params = [];
  const tuples = rowsOfValues.map((row) => {
    const placeholders = row.map((value) => {
      params.push(value);
      return `$${params.length}`;
    });
    return `(${placeholders.join(",")})`;
  });
  return { sql: tuples.join(","), params };
}

async function dummyUserExists(client) {
  const { rows } = await client.query('SELECT id FROM "user" WHERE id = $1', [DUMMY_USER_ID]);
  return rows.length > 0;
}

async function createDummy(client, contactCount) {
  if (await dummyUserExists(client)) {
    console.log(
      `Dummy account already exists (${DUMMY_EMAIL}). Run "recreate" to reset it, or "delete" first.`,
    );
    return;
  }

  const now = new Date();
  await client.query(
    `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at, is_admin)
     VALUES ($1, $2, $3, true, $4, $4, false)`,
    [DUMMY_USER_ID, DUMMY_NAME, DUMMY_EMAIL, now],
  );
  const passwordHash = await hashPassword(DUMMY_PASSWORD);
  await client.query(
    `INSERT INTO "account" (id, account_id, provider_id, user_id, password, created_at, updated_at)
     VALUES ($1, $2, 'credential', $2, $3, $4, $4)`,
    [randomUUID(), DUMMY_USER_ID, passwordHash, now],
  );

  // Tenant-scoped from here on: RLS's tenant_isolation policy requires
  // app.current_user_id to match user_id on every row this session writes.
  await client.query("SELECT set_config('app.current_user_id', $1, false)", [DUMMY_USER_ID]);

  const companyCount = Math.max(1, Math.round(contactCount / 15));
  const companyIds = Array.from({ length: companyCount }, () => randomUUID());
  const companyRows = companyIds.map((id, i) => [
    id,
    `Dummy Co ${String(i + 1).padStart(3, "0")}`,
    DUMMY_USER_ID,
  ]);
  for (const batch of chunk(companyRows, 500)) {
    const { sql, params } = buildValuesClause(batch);
    await client.query(
      `INSERT INTO companies (id, name, user_id) VALUES ${sql}`,
      params,
    );
  }
  console.log(`Created ${companyRows.length} dummy companies.`);

  const contactIds = Array.from({ length: contactCount }, () => randomUUID());
  const contactRows = contactIds.map((id, i) => [
    id,
    `Dummy Contact ${String(i + 1).padStart(5, "0")}`,
    "Load Test Role",
    companyIds[i % companyIds.length],
    "import",
    DUMMY_USER_ID,
  ]);
  for (const batch of chunk(contactRows, 500)) {
    const { sql, params } = buildValuesClause(batch);
    await client.query(
      `INSERT INTO contacts
         (id, name, title, company_id, emails, phones, links, tags, source, watched_for_signals, user_id)
       SELECT v.id, v.name, v.title, v.company_id, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
              v.source, false, v.user_id
       FROM (VALUES ${sql}) AS v(id, name, title, company_id, source, user_id)`,
      params,
    );
  }
  console.log(`Created ${contactRows.length} dummy contacts.`);

  const edgeCount = Math.floor(contactCount / 3);
  const edgeRows = [];
  for (let i = 0; i < edgeCount; i++) {
    const a = contactIds[Math.floor(Math.random() * contactIds.length)];
    let b = contactIds[Math.floor(Math.random() * contactIds.length)];
    if (a === b) continue;
    const predicate = EDGE_PREDICATES[i % EDGE_PREDICATES.length];
    edgeRows.push([randomUUID(), "contact", a, predicate, "contact", b, DUMMY_USER_ID]);
  }
  for (const batch of chunk(edgeRows, 500)) {
    const { sql, params } = buildValuesClause(batch);
    await client.query(
      `INSERT INTO edges (id, src_type, src_id, predicate, dst_type, dst_id, user_id) VALUES ${sql}`,
      params,
    );
  }
  console.log(`Created ${edgeRows.length} dummy relationship edges (plus "works at" edges implied by company_id).`);

  console.log("\nDone. Log in with:");
  console.log(`  email:    ${DUMMY_EMAIL}`);
  console.log(`  password: ${DUMMY_PASSWORD}`);
}

async function deleteDummy(client) {
  if (!(await dummyUserExists(client))) {
    console.log("No dummy account found — nothing to delete.");
    return;
  }
  await client.query("SELECT set_config('app.current_user_id', $1, false)", [DUMMY_USER_ID]);
  const edges = await client.query("DELETE FROM edges WHERE user_id = $1", [DUMMY_USER_ID]);
  const contacts = await client.query("DELETE FROM contacts WHERE user_id = $1", [DUMMY_USER_ID]);
  const companies = await client.query("DELETE FROM companies WHERE user_id = $1", [DUMMY_USER_ID]);
  // Cascades to session/account/passkey/two_factor rows for this user.
  await client.query('DELETE FROM "user" WHERE id = $1', [DUMMY_USER_ID]);
  console.log(
    `Deleted dummy account: ${edges.rowCount} edges, ${contacts.rowCount} contacts, ${companies.rowCount} companies.`,
  );
}

async function main() {
  const { command, contacts } = parseArgs(process.argv);
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set — point it at the target Postgres/Supabase instance.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (command === "delete" || command === "recreate") await deleteDummy(client);
    if (command === "create" || command === "recreate") await createDummy(client, contacts);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
