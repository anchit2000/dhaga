/**
 * Shared util for the domain "case study" demo accounts.
 *
 * Each domain (real estate, VC, recruiting, …) has a small, login-able demo
 * account whose graph is populated with domain-flavoured companies, contacts,
 * positions, events and notes — so a screenshot of /app/graph reads as *that*
 * profession's network. `scripts/seed-domains/<slug>.mjs` supplies a friendly
 * spec; this maps it onto the exact table/column shapes the main seeder uses
 * and writes it under a dedicated user_id with Postgres RLS enforced.
 *
 * Reuses the proven insert helper + column lists from seed-dummy-graph.mjs so
 * there is a single source of truth for the schema shape.
 *
 * Run a domain file (from apps/web):
 *   node --env-file=.env.vercel scripts/seed-domains/real-estate.mjs
 */
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { hashPassword } from "better-auth/crypto";
import { insertRows } from "./sql.mjs";

// Shared password for every demo account (throwaway demo data, not a secret).
export const DEMO_PASSWORD = "DhagaDemo-2026!";

const now = () => new Date();
// Fixed reference dates so event timelines look plausible without needing
// Date-based randomness. Events are spread across the last ~18 months.
function eventDate(index) {
  const base = new Date("2026-06-01T18:00:00Z").getTime();
  return new Date(base - index * 45 * 86_400_000);
}

async function ensureUser(client, { userId, email, displayName }) {
  const { rows } = await client.query('SELECT id FROM "user" WHERE id = $1', [userId]);
  if (rows.length > 0) return;
  const ts = now();
  await client.query(
    `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at, is_admin)
     VALUES ($1, $2, $3, true, $4, $4, false)`,
    [userId, displayName, email, ts],
  );
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  await client.query(
    `INSERT INTO "account" (id, account_id, provider_id, user_id, password, created_at, updated_at)
     VALUES ($1, $2, 'credential', $2, $3, $4, $4)`,
    [randomUUID(), userId, passwordHash, ts],
  );
}

// Removes only this tenant's graph rows (keeps the user/account so the login
// survives a reseed). FK-safe order.
async function clearData(client, userId) {
  await client.query(`DELETE FROM notes WHERE user_id = $1`, [userId]);
  await client.query(`DELETE FROM event_contacts WHERE user_id = $1`, [userId]);
  await client.query(`DELETE FROM events WHERE user_id = $1`, [userId]);
  await client.query(
    `DELETE FROM positions WHERE contact_id IN (SELECT id FROM contacts WHERE user_id = $1)`,
    [userId],
  );
  await client.query(`DELETE FROM contacts WHERE user_id = $1`, [userId]);
  await client.query(`DELETE FROM companies WHERE user_id = $1`, [userId]);
}

/**
 * spec = {
 *   slug, displayName,
 *   companies: [{ name, sector }],
 *   contacts:  [{ name, title, company, location, tags: [], note }],  // company = a companies[].name
 *   events:    [{ name, emoji, tags: [], attendees: [contactName] }],
 * }
 */
export async function seedDomainAccount(spec) {
  const { slug } = spec;
  if (!slug) throw new Error("spec.slug is required");
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set — run with `node --env-file=.env.vercel ...`");
    process.exit(1);
  }

  const userId = `demo-${slug}`;
  const email = spec.email ?? `demo-${slug}@dhaga.internal`;
  const displayName = spec.displayName ?? `${slug} demo`;

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await ensureUser(client, { userId, email, displayName });

    // Tenant-scoped from here: RLS requires app.current_user_id === user_id.
    await client.query("SELECT set_config('app.current_user_id', $1, false)", [userId]);
    await clearData(client, userId);

    // --- companies ---
    const companyId = new Map();
    const companyRows = (spec.companies ?? []).map((c) => {
      const id = randomUUID();
      companyId.set(c.name, id);
      const domain = `${String(c.name).toLowerCase().replace(/[^a-z0-9]+/g, "")}.example`;
      return [id, c.name, domain, c.sector ?? null, userId];
    });
    await insertRows(client, "companies", ["id", "name", "domain", "sector", "user_id"], companyRows);

    // --- contacts (+ one current position each, when they have a company) ---
    const contactId = new Map();
    const contactRows = [];
    const positionRows = [];
    const noteRows = [];
    for (const c of spec.contacts ?? []) {
      const id = randomUUID();
      contactId.set(c.name, id);
      const cid = c.company ? companyId.get(c.company) ?? null : null;
      contactRows.push([
        id,
        c.name,
        c.title ?? null,
        cid,
        JSON.stringify([]),
        JSON.stringify([]),
        c.location ?? null,
        JSON.stringify(c.tags ?? []),
        "demo",
        userId,
      ]);
      if (cid) {
        positionRows.push([randomUUID(), id, cid, c.title ?? null, true, now(), null]);
      }
      if (c.note) {
        noteRows.push([randomUUID(), id, "note", c.note, userId]);
      }
    }
    await insertRows(
      client,
      "contacts",
      ["id", "name", "title", "company_id", "emails", "phones", "location", "tags", "source", "user_id"],
      contactRows,
      ["", "", "", "", "::jsonb", "::jsonb", "", "::jsonb", "", ""],
    );
    await insertRows(
      client,
      "positions",
      ["id", "contact_id", "company_id", "title", "is_current", "started_at", "ended_at"],
      positionRows,
    );

    // --- events (+ attendance) ---
    const eventRows = [];
    const eventContactRows = [];
    (spec.events ?? []).forEach((e, i) => {
      const id = randomUUID();
      const start = eventDate(i);
      eventRows.push([id, e.name, start, start, null, e.emoji ?? null, JSON.stringify(e.tags ?? []), userId]);
      for (const attendee of e.attendees ?? []) {
        const cid = contactId.get(attendee);
        if (cid) eventContactRows.push([id, cid, start, userId]);
      }
    });
    await insertRows(
      client,
      "events",
      ["id", "name", "started_at", "ended_at", "color", "emoji", "tags", "user_id"],
      eventRows,
      ["", "", "", "", "", "", "::jsonb", ""],
    );
    await insertRows(
      client,
      "event_contacts",
      ["event_id", "contact_id", "scanned_at", "user_id"],
      eventContactRows,
    );

    // --- notes ---
    await insertRows(client, "notes", ["id", "contact_id", "kind", "body", "user_id"], noteRows);

    await client.query("COMMIT");
    console.log(
      `✓ seeded ${slug}: ${companyRows.length} companies, ${contactRows.length} contacts, ` +
        `${eventRows.length} events, ${noteRows.length} notes`,
    );
    console.log(`  login: ${email} / ${DEMO_PASSWORD}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`✗ ${slug} failed:`, error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
