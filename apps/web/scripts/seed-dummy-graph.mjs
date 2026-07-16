#!/usr/bin/env node
/**
 * Seeds (or removes) exactly one dummy, RLS-scoped account with a realistic
 * synthetic "life network" — overlapping family/work/friends/services/event
 * circles with power-law hubs and bridge contacts — for load-testing
 * /app/graph and /app/people rendering at scale. Every row this script writes
 * carries user_id = the dummy account's id, and every write/delete runs with
 * app.current_user_id set to that same id — Postgres RLS (packages/ee's
 * tenant_isolation policy) then makes it structurally impossible for this
 * script to read or touch any other tenant's rows, no matter the row count.
 *
 * Usage (from apps/web):
 *   node --env-file=.env.vercel scripts/seed-dummy-graph.mjs create [--contacts=1000] [--seed=N] [--with-notes] [--stress]
 *   node --env-file=.env.vercel scripts/seed-dummy-graph.mjs delete
 *   node --env-file=.env.vercel scripts/seed-dummy-graph.mjs recreate [--contacts=1000] [--seed=N] [--with-notes] [--stress]
 *
 * The generator is deterministic: the same --seed (default fixed) reproduces
 * the exact same network. Generation logic lives in ./seed-lib/.
 *
 * --stress layers deliberately pathological worst-case data on top of the
 * realistic network (tag explosion, mega-events, a mega-employer, super-hub
 * contacts) for perf testing; omitting it reproduces today's output exactly.
 *
 * Deliberately raw `pg` + `better-auth/crypto`, no drizzle/schema import:
 * a throwaway seed script has no reason to pull in the app's ORM wiring,
 * and `hashPassword` is the same function better-auth's own signup path
 * uses, so the account can log in through the normal email/password form.
 */
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { hashPassword } from "better-auth/crypto";
import { generateLifeNetwork } from "./seed-lib/generate.mjs";
import { insertRows } from "./seed-lib/sql.mjs";

const DUMMY_USER_ID = "dummy-loadtest-user";
const DUMMY_EMAIL = "loadtest@dhaga.internal";
const DUMMY_NAME = "Dummy Load Test";
const DUMMY_PASSWORD = "LoadTest-Dummy-2026!";
const DEFAULT_SEED = 20260716;

function parseArgs(argv) {
  const command = argv[2];
  const flagValue = (name, fallback) => {
    const flag = argv.find((arg) => arg.startsWith(`--${name}=`));
    return flag ? Number(flag.split("=")[1]) : fallback;
  };
  const contacts = flagValue("contacts", 1000);
  const seed = flagValue("seed", DEFAULT_SEED);
  const withNotes = argv.includes("--with-notes");
  const stress = argv.includes("--stress");
  if (!["create", "delete", "recreate"].includes(command)) {
    console.error("Usage: seed-dummy-graph.mjs <create|delete|recreate> [--contacts=N] [--seed=N] [--with-notes] [--stress]");
    process.exit(1);
  }
  if (!Number.isInteger(contacts) || contacts < 1) {
    console.error("--contacts must be a positive integer");
    process.exit(1);
  }
  if (!Number.isInteger(seed)) {
    console.error("--seed must be an integer");
    process.exit(1);
  }
  return { command, contacts, seed, withNotes, stress };
}

async function dummyUserExists(client) {
  const { rows } = await client.query('SELECT id FROM "user" WHERE id = $1', [DUMMY_USER_ID]);
  return rows.length > 0;
}

async function createDummy(client, { contacts, seed, withNotes, stress }) {
  if (await dummyUserExists(client)) {
    console.log(`Dummy account already exists (${DUMMY_EMAIL}). Run "recreate" to reset it, or "delete" first.`);
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

  const net = generateLifeNetwork({ seed, userId: DUMMY_USER_ID, contactCount: contacts, withNotes, stress });

  const counts = {};
  counts.companies = await insertRows(client, "companies", ["id", "name", "domain", "sector", "user_id"], net.companies);
  counts.contacts = await insertRows(
    client,
    "contacts",
    ["id", "name", "title", "company_id", "emails", "phones", "location", "tags", "source", "user_id"],
    net.contacts,
    ["", "", "", "", "::jsonb", "::jsonb", "", "::jsonb", "", ""],
  );
  counts.positions = await insertRows(
    client,
    "positions",
    ["id", "contact_id", "company_id", "title", "is_current", "started_at", "ended_at"],
    net.positions,
  );
  counts.node_types = await insertRows(client, "node_types", ["id", "name", "slug", "color", "user_id"], net.nodeTypes);
  counts.entities = await insertRows(client, "entities", ["id", "type_id", "name", "description", "user_id"], net.entities);
  counts.relationship_types = await insertRows(
    client,
    "relationship_types",
    ["id", "slug", "forward_label", "inverse_label", "user_id"],
    net.relationshipTypes,
  );
  counts.events = await insertRows(
    client,
    "events",
    ["id", "name", "started_at", "ended_at", "color", "emoji", "tags", "user_id"],
    net.events,
    ["", "", "", "", "", "", "::jsonb", ""],
  );
  counts.event_contacts = await insertRows(
    client,
    "event_contacts",
    ["event_id", "contact_id", "scanned_at", "user_id"],
    net.eventContacts,
  );
  counts.edges = await insertRows(
    client,
    "edges",
    ["id", "src_type", "src_id", "predicate", "dst_type", "dst_id", "user_id"],
    net.edges,
  );
  counts.notes = await insertRows(client, "notes", ["id", "contact_id", "kind", "body", "user_id"], net.notes);
  counts.facts = await insertRows(
    client,
    "facts",
    ["id", "contact_id", "type", "text", "confidence", "source_note_id", "user_id"],
    net.facts,
  );

  console.log(`Circle plan for --contacts=${contacts}:`, net.plan);
  if (stress) console.log("--stress: pathological worst-case data added on top of the network above.");
  console.log("Created:", counts);
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
  // FK order: edges/facts before notes (source_note_id), notes before
  // entities and contacts, event_contacts before events and contacts,
  // positions (no user_id column — not a tenant table) via the tenant's
  // contacts, entities before node_types, contacts before companies.
  const counts = {};
  for (const table of ["edges", "facts", "notes", "event_contacts", "events"]) {
    counts[table] = (await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [DUMMY_USER_ID])).rowCount;
  }
  counts.positions = (
    await client.query("DELETE FROM positions WHERE contact_id IN (SELECT id FROM contacts WHERE user_id = $1)", [
      DUMMY_USER_ID,
    ])
  ).rowCount;
  for (const table of ["entities", "node_types", "relationship_types", "contacts", "companies"]) {
    counts[table] = (await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [DUMMY_USER_ID])).rowCount;
  }
  // Cascades to session/account/passkey/two_factor rows for this user.
  await client.query('DELETE FROM "user" WHERE id = $1', [DUMMY_USER_ID]);
  console.log("Deleted dummy account:", counts);
}

async function main() {
  const { command, contacts, seed, withNotes, stress } = parseArgs(process.argv);
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set — point it at the target Postgres/Supabase instance.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (command === "delete" || command === "recreate") await deleteDummy(client);
    if (command === "create" || command === "recreate") await createDummy(client, { contacts, seed, withNotes, stress });
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
