#!/usr/bin/env node
/**
 * Adds a small, deterministic set of DUPLICATE contacts and companies to the
 * dummy load-test account, so the duplicate-detection screens
 * (/app/people/duplicates, /app/companies/duplicates) and the merge flow have
 * legible sample data for docs screenshots and manual testing.
 *
 * The main generator (seed-dummy-graph.mjs) deliberately de-collides names and
 * companies, so on its own both /duplicates pages render (almost) empty — this
 * layers a couple of obvious, hand-picked duplicates on top.
 *
 * Idempotent: fixed row ids, so re-running replaces the same rows. Run AFTER
 * seed-dummy-graph.mjs (needs the dummy user to exist), from apps/web:
 *
 *   node --env-file=.env.vercel scripts/seed-demo-duplicates.mjs
 */
import { Pool } from "pg";

const USER_ID = "dummy-loadtest-user";

// Fixed ids → idempotent (delete-then-insert on every run).
const CO = { acme: "demo-dup-co-acme", acmeInc: "demo-dup-co-acme-inc", acmeLlc: "demo-dup-co-acme-llc" };
const CT = { jordanA: "demo-dup-ct-jordan-a", jordanB: "demo-dup-ct-jordan-b", priyaA: "demo-dup-ct-priya-a", priyaB: "demo-dup-ct-priya-b" };

// Three raw names that all normalise to "acme" (legal-suffix stripping) → one cluster.
const companies = [
  { id: CO.acme, name: "Acme", domain: "acme.example", sector: "SaaS" },
  { id: CO.acmeInc, name: "Acme, Inc.", domain: "acme.io", sector: "SaaS" },
  { id: CO.acmeLlc, name: "Acme LLC", domain: null, sector: "SaaS" },
];

const jordanEmail = JSON.stringify([{ value: "jordan.rivera@acme.example", label: "Work", note: null }]);
const priyaPhone = JSON.stringify([{ value: "+1 555 0100", label: "Mobile", note: null }]);

// Two Jordans share an email (and name); two Priyas share a phone (and name).
const contacts = [
  { id: CT.jordanA, name: "Jordan Rivera", title: "Founder & CEO", companyId: CO.acme, emails: jordanEmail, phones: "[]", tags: '["work"]', source: "card_scan" },
  { id: CT.jordanB, name: "Jordan Rivera", title: "CEO", companyId: CO.acmeInc, emails: jordanEmail, phones: "[]", tags: '["import"]', source: "import" },
  { id: CT.priyaA, name: "Priya Nair", title: "Head of Design", companyId: CO.acme, emails: "[]", phones: priyaPhone, tags: '["work"]', source: "manual" },
  { id: CT.priyaB, name: "Priya Nair", title: "Design Lead", companyId: CO.acmeLlc, emails: "[]", phones: priyaPhone, tags: '["import"]', source: "import" },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set — point it at the target Postgres/Supabase instance.");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query('SELECT id FROM "user" WHERE id = $1', [USER_ID]);
    if (rows.length === 0) throw new Error(`Dummy user ${USER_ID} not found — run seed-dummy-graph.mjs first.`);
    // RLS: every write must carry this user's id (packages/ee tenant_isolation).
    await client.query("SELECT set_config('app.current_user_id', $1, false)", [USER_ID]);

    const contactIds = Object.values(CT);
    const companyIds = Object.values(CO);
    // Idempotent cleanup (contacts before companies for the FK).
    await client.query("DELETE FROM positions WHERE contact_id = ANY($1)", [contactIds]);
    await client.query("DELETE FROM contacts WHERE id = ANY($1)", [contactIds]);
    await client.query("DELETE FROM companies WHERE id = ANY($1)", [companyIds]);

    for (const co of companies) {
      await client.query(
        "INSERT INTO companies (id, name, domain, sector, user_id) VALUES ($1,$2,$3,$4,$5)",
        [co.id, co.name, co.domain, co.sector, USER_ID],
      );
    }
    for (const ct of contacts) {
      await client.query(
        `INSERT INTO contacts (id, name, title, company_id, emails, phones, tags, source, user_id)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8,$9)`,
        [ct.id, ct.name, ct.title, ct.companyId, ct.emails, ct.phones, ct.tags, ct.source, USER_ID],
      );
    }
    await client.query("COMMIT");
    console.log(
      "Seeded demo duplicates: companies Acme / Acme, Inc. / Acme LLC; contacts 2x Jordan Rivera (shared email) + 2x Priya Nair (shared phone).",
    );
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
