/**
 * Seed contact-sync conflicts for the dummy load-test user.
 *
 * `/app/sync/conflicts` only renders links whose `conflicts` array is non-empty,
 * and the only way to produce one for real is a three-way merge where BOTH the
 * phone and Dhaga moved the same field off the base snapshot. That needs a
 * device, which the doc-screenshot box does not have — so the review surface
 * would otherwise be the one new page in this feature with no way to photograph
 * it. This writes the same rows a genuine both-edited sync run would leave
 * behind: the phone's value already adopted into `contacts`, the losing Dhaga
 * value parked on the link.
 *
 * Both `kind`s are seeded on purpose so the screenshot shows both labels — a
 * shot of only `both_edited` would document half the surface.
 *
 * Deliberately raw `pg`, no drizzle/schema import — mirrors seed-confirmations.mjs
 * and seed-dummy-graph.mjs. Writes rely on the same RLS default the real app
 * writer uses (`contact_links.user_id` DEFAULTs to
 * current_setting('app.current_user_id')), which this session sets.
 *
 * Usage (from apps/web), against the Supabase DB in .env.vercel:
 *   node --env-file=.env.vercel scripts/seed-sync-conflicts.mjs
 *
 * `contact_links` is created by this branch's boot DDL, so serve the app once
 * (scripts/serve-supabase.mjs) and load an authed page before seeding.
 */
import { Pool } from "pg";

const DUMMY_USER_ID = "dummy-loadtest-user";
const AT = "2026-07-29T09:14:00.000Z"; // fixed, so re-running does not churn the shot

const CONFLICTS = [
  {
    externalId: "seed-conflict-company",
    base: { company: "Acme" },
    conflicts: [
      {
        field: "company",
        kind: "both_edited",
        local: "Acme Corp",
        remote: "Acme International",
        at: AT,
      },
    ],
  },
  {
    externalId: "seed-conflict-title",
    base: { title: "Engineer" },
    conflicts: [
      {
        field: "title",
        kind: "both_edited",
        local: "VP Engineering",
        remote: "Head of Engineering",
        at: AT,
      },
    ],
  },
  {
    externalId: "seed-conflict-phones",
    base: { phones: [{ value: "+91 98765 43210", label: "Mobile", note: null }] },
    conflicts: [
      {
        field: "phones",
        kind: "edited_vs_removed",
        local: [{ value: "+91 98765 43210", label: "Work", note: null }],
        remote: [],
        at: AT,
      },
    ],
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error(
      "DATABASE_URL is not set — point it at the target Postgres/Supabase instance (.env.vercel).",
    );
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const client = await pool.connect();
  try {
    const { rows: users } = await client.query('SELECT id FROM "user" WHERE id = $1', [
      DUMMY_USER_ID,
    ]);
    if (users.length === 0) {
      console.error(
        `No such user ${DUMMY_USER_ID}. Run scripts/seed-dummy-graph.mjs first.`,
      );
      process.exit(1);
    }

    const { rows: tables } = await client.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'contact_links'`,
    );
    if (tables.length === 0) {
      console.error(
        "contact_links does not exist yet. Serve the app once (scripts/serve-supabase.mjs)\n" +
          "and load an authed page so the boot DDL creates it, then re-run this.",
      );
      process.exit(1);
    }

    // Tenant-scoped from here: reads filter by user_id AND are filtered by RLS;
    // every write's user_id DEFAULTs from this same setting.
    await client.query("SELECT set_config('app.current_user_id', $1, false)", [DUMMY_USER_ID]);

    // DISTINCT ON (name), then a stable hash order. The dummy graph deliberately
    // contains duplicate people for the merge demo ("Aarav Bose" ×3), so a plain
    // ORDER BY name LIMIT 3 hands back three copies of one contact and the review
    // queue reads as one person arguing with themselves. Hashing the id spreads
    // the picks across the alphabet without making the seed non-deterministic.
    const { rows: contacts } = await client.query(
      `SELECT id, name FROM (
         SELECT DISTINCT ON (name) id, name
           FROM contacts
          WHERE user_id = $1 AND source <> 'mentioned'
          ORDER BY name, id
       ) t
       ORDER BY md5(t.id)
       LIMIT $2`,
      [DUMMY_USER_ID, CONFLICTS.length],
    );
    if (contacts.length < CONFLICTS.length) {
      console.error(
        `Need ${CONFLICTS.length} contacts, found ${contacts.length}. Seed the dummy graph first.`,
      );
      process.exit(1);
    }

    // Idempotent: re-running replaces the seeded links rather than stacking them.
    await client.query(
      `DELETE FROM contact_links WHERE user_id = $1 AND external_id = ANY($2::text[])`,
      [DUMMY_USER_ID, CONFLICTS.map((c) => c.externalId)],
    );

    for (const [i, spec] of CONFLICTS.entries()) {
      const contact = contacts[i];
      await client.query(
        `INSERT INTO contact_links
           (id, contact_id, provider, external_id, container_id, etag,
            base_snapshot, conflicts, last_pulled_at, last_pushed_at, state)
         VALUES ($1, $2, 'device', $3, 'seed-container', NULL,
                 $4::jsonb, $5::jsonb, now(), now(), 'linked')`,
        [
          `link-${spec.externalId}`,
          contact.id,
          spec.externalId,
          JSON.stringify(spec.base),
          JSON.stringify(spec.conflicts),
        ],
      );
      console.log(
        `seeded ${spec.conflicts[0].field} (${spec.conflicts[0].kind}) on ${contact.name}`,
      );
    }

    const { rows: check } = await client.query(
      `SELECT count(*)::int AS n FROM contact_links
        WHERE user_id = $1 AND jsonb_array_length(conflicts) > 0`,
      [DUMMY_USER_ID],
    );
    console.log(`\n${check[0].n} link(s) now pending review at /app/sync/conflicts`);
  } finally {
    client.release();
    await pool.end();
  }
}

await main();
