/**
 * Shared util for the domain "case study" demo accounts.
 *
 * Each domain (real estate, VC, recruiting, …) has a login-able, RLS-scoped
 * demo account whose data is rich enough to screenshot the app's real value
 * screens: a contact profile (facts + receipts, relationships, notes,
 * follow-ups, keep-in-touch), the home dashboard (reach-out cadence +
 * follow-ups + going-quiet), and a focused graph (/app/graph?focus=<id>).
 *
 * `scripts/seed-domains/<slug>.mjs` supplies a friendly spec; this maps it onto
 * the exact table/column shapes the main seeder uses. One contact may be marked
 * `hero: true` — it gets the deterministic id `demo-<slug>-hero` so the capture
 * script can deep-link its profile and graph focus.
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
const daysAgo = (n) => new Date(Date.now() - n * 86_400_000);
function eventDate(index) {
  const base = new Date("2026-06-01T18:00:00Z").getTime();
  return new Date(base - index * 45 * 86_400_000);
}
const confidence = (i) => Math.min(0.98, 0.74 + ((i * 7) % 24) / 100); // deterministic 0.74–0.97

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

// Removes only this tenant's graph rows (keeps the user/account so login
// survives a reseed). FK-safe: facts/follow_ups/edges (→ notes) before notes.
async function clearData(client, userId) {
  for (const table of ["facts", "follow_ups", "edges", "event_contacts", "notes"]) {
    await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
  }
  await client.query(
    `DELETE FROM positions WHERE contact_id IN (SELECT id FROM contacts WHERE user_id = $1)`,
    [userId],
  );
  for (const table of ["events", "contacts", "relationship_types", "companies"]) {
    await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
  }
}

/**
 * spec = {
 *   slug, displayName, email?,
 *   relationshipTypes: [{ slug, forward, inverse }],   // optional custom edge labels
 *   companies: [{ name, sector }],
 *   contacts: [{
 *     name, title, company, location, tags: [],
 *     hero: true,                       // one contact → id demo-<slug>-hero
 *     cadenceDays, lastReachedOutDaysAgo,
 *     notes: ["…"], note: "…",          // timeline entries (note = single)
 *     facts: [{ type, text }],          // type ∈ role|intent|personal|preference
 *     followUps: [{ action, dueHint }], // open follow-ups
 *   }],
 *   events: [{ name, emoji, tags: [], attendees: [contactName] }],
 *   relationships: [{ from, predicate, to }],   // person↔person edges
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
  const heroId = `demo-${slug}-hero`;

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await ensureUser(client, { userId, email, displayName });
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

    // --- contacts (+ positions, notes, facts, follow-ups) ---
    const contactId = new Map();
    const contactRows = [];
    const positionRows = [];
    const noteRows = [];
    const factRows = [];
    const followUpRows = [];
    for (const c of spec.contacts ?? []) {
      const id = c.hero ? heroId : randomUUID();
      contactId.set(c.name, id);
      const cid = c.company ? companyId.get(c.company) ?? null : null;
      const lastReached = c.lastReachedOutDaysAgo != null ? daysAgo(c.lastReachedOutDaysAgo) : null;
      contactRows.push([
        id,
        c.name,
        c.title ?? null,
        cid,
        JSON.stringify([]),
        JSON.stringify([]),
        c.location ?? null,
        JSON.stringify(c.tags ?? []),
        c.cadenceDays ?? null,
        lastReached,
        "demo",
        userId,
      ]);
      if (cid) positionRows.push([randomUUID(), id, cid, c.title ?? null, true, now(), null]);

      const noteBodies = [...(c.notes ?? []), ...(c.note ? [c.note] : [])];
      let receiptNoteId = null;
      noteBodies.forEach((body, i) => {
        const nid = randomUUID();
        if (i === 0) receiptNoteId = nid;
        noteRows.push([nid, id, "note", body, userId]);
      });
      (c.facts ?? []).forEach((f, i) => {
        factRows.push([randomUUID(), id, f.type ?? "personal", f.text, confidence(i), receiptNoteId, userId]);
      });
      (c.followUps ?? []).forEach((f) => {
        followUpRows.push([randomUUID(), id, f.action, f.dueHint ?? null, "open", userId]);
      });
    }
    await insertRows(
      client,
      "contacts",
      ["id", "name", "title", "company_id", "emails", "phones", "location", "tags", "reach_out_every_days", "last_reached_out_at", "source", "user_id"],
      contactRows,
      ["", "", "", "", "::jsonb", "::jsonb", "", "::jsonb", "", "", "", ""],
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
    await insertRows(client, "event_contacts", ["event_id", "contact_id", "scanned_at", "user_id"], eventContactRows);

    // --- notes, facts, follow-ups ---
    await insertRows(client, "notes", ["id", "contact_id", "kind", "body", "user_id"], noteRows);
    await insertRows(client, "facts", ["id", "contact_id", "type", "text", "confidence", "source_note_id", "user_id"], factRows);
    await insertRows(client, "follow_ups", ["id", "contact_id", "action", "due_hint", "status", "user_id"], followUpRows);

    // --- custom relationship labels + person↔person edges ---
    const relTypeRows = (spec.relationshipTypes ?? []).map((r) => [
      randomUUID(),
      r.slug,
      r.forward,
      r.inverse,
      userId,
    ]);
    await insertRows(client, "relationship_types", ["id", "slug", "forward_label", "inverse_label", "user_id"], relTypeRows);

    const edgeRows = [];
    for (const r of spec.relationships ?? []) {
      const src = contactId.get(r.from);
      const dst = contactId.get(r.to);
      if (src && dst && src !== dst) {
        edgeRows.push([randomUUID(), "contact", src, r.predicate, "contact", dst, userId]);
      }
    }
    await insertRows(client, "edges", ["id", "src_type", "src_id", "predicate", "dst_type", "dst_id", "user_id"], edgeRows);

    await client.query("COMMIT");
    console.log(
      `✓ seeded ${slug}: ${companyRows.length} companies, ${contactRows.length} contacts, ` +
        `${eventRows.length} events, ${noteRows.length} notes, ${factRows.length} facts, ` +
        `${followUpRows.length} follow-ups, ${edgeRows.length} relationships`,
    );
    console.log(`  login: ${email} / ${DEMO_PASSWORD}   hero: /app/people/${heroId}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`✗ ${slug} failed:`, error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
