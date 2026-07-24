// Read-only DB diagnostics for the search hot path against the hosted Supabase
// DB. Confirms row counts, samples real query terms, lists indexes on the
// searched tables, and runs EXPLAIN (ANALYZE, BUFFERS) on the exact queries the
// normal-search keyword sources and the graph typeahead issue — so we can see
// seq-scan vs index-scan and per-query timing before touching anything.
//
// Run: node --env-file=.env.vercel scripts/bench/db-diagnose.mjs
import pg from "pg";

const DUMMY_USER_ID = "dummy-loadtest-user";
const { Client } = pg;

function rss(client, q, params) {
  return client.query(q, params).then((r) => r.rows);
}

async function explain(client, label, q, params = []) {
  const rows = await rss(client, `EXPLAIN (ANALYZE, BUFFERS, TIMING) ${q}`, params);
  const plan = rows.map((r) => r["QUERY PLAN"]).join("\n");
  const exec = /Execution Time: ([\d.]+) ms/.exec(plan)?.[1];
  const planning = /Planning Time: ([\d.]+) ms/.exec(plan)?.[1];
  const seqScans = (plan.match(/Seq Scan/g) || []).length;
  console.log(`\n### ${label}`);
  console.log(`  exec=${exec}ms planning=${planning}ms seqScans=${seqScans}`);
  console.log(plan.split("\n").map((l) => "    " + l).join("\n"));
  return { label, exec: Number(exec), planning: Number(planning), seqScans };
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set (run with --env-file=.env.vercel)");
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query("SELECT set_config('app.current_user_id', $1, false)", [DUMMY_USER_ID]);

  // 1. Row counts (RLS-scoped to the load-test user)
  console.log("=== Row counts (RLS-scoped) ===");
  for (const t of ["contacts", "companies", "notes", "facts", "follow_ups", "events", "event_contacts", "signals", "embeddings"]) {
    try {
      const [{ count }] = await rss(client, `SELECT count(*)::int AS count FROM ${t}`);
      console.log(`  ${t.padEnd(16)} ${count}`);
    } catch (e) {
      console.log(`  ${t.padEnd(16)} ERR ${e.message}`);
    }
  }

  // 2. Sample real contact names -> realistic query tokens
  const names = await rss(client, "SELECT name FROM contacts WHERE name IS NOT NULL ORDER BY random() LIMIT 8");
  console.log("\n=== Sample contact names ===");
  names.forEach((r) => console.log("  " + r.name));

  // 3. Indexes on searched tables
  console.log("\n=== Indexes on searched tables ===");
  const idx = await rss(
    client,
    `SELECT tablename, indexname, indexdef FROM pg_indexes
     WHERE tablename IN ('contacts','companies','notes','facts','follow_ups','events','signals','entities','ai_actions','embeddings')
     ORDER BY tablename, indexname`,
  );
  for (const r of idx) console.log(`  [${r.tablename}] ${r.indexname}`);

  // Build a realistic tsquery + words from a sampled name's first token >=3 chars
  const sampleWord =
    (names.map((r) => r.name.toLowerCase().split(/[^\p{L}\p{N}]+/u).find((w) => w.length >= 3)).find(Boolean)) || "sar";
  const words = [sampleWord];
  const tsq = words.map((w) => `${w}:*`).join(" | ");
  console.log(`\n=== Using sample word="${sampleWord}" tsq="${tsq}" ===`);

  const results = [];

  // 4a. contactAndCompanyHits — the big OR incl. word_similarity fuzzy pass
  results.push(
    await explain(
      client,
      "contactAndCompanyHits (identity, OR incl. word_similarity)",
      `SELECT c.id,
              ts_rank(c.search_tsv, to_tsquery('english', $1))
              + coalesce(ts_rank(co.search_tsv, to_tsquery('english', $1)), 0)
              + word_similarity($2, lower(c.name)) AS rank
       FROM contacts c LEFT JOIN companies co ON c.company_id = co.id
       WHERE c.search_tsv @@ to_tsquery('english', $1)
          OR co.search_tsv @@ to_tsquery('english', $1)
          OR c.emails::text ILIKE $3 OR c.phones::text ILIKE $3 OR c.links::text ILIKE $3
          OR co.domain ILIKE $3
          OR word_similarity($2, lower(c.name)) > 0.5`,
      [tsq, sampleWord, `%${sampleWord}%`],
    ),
  );

  // 4b. Same query but WITHOUT the word_similarity OR branch (isolates its cost)
  results.push(
    await explain(
      client,
      "contactAndCompanyHits WITHOUT word_similarity OR branch",
      `SELECT c.id
       FROM contacts c LEFT JOIN companies co ON c.company_id = co.id
       WHERE c.search_tsv @@ to_tsquery('english', $1)
          OR co.search_tsv @@ to_tsquery('english', $1)
          OR c.emails::text ILIKE $2 OR c.phones::text ILIKE $2 OR c.links::text ILIKE $2
          OR co.domain ILIKE $2`,
      [tsq, `%${sampleWord}%`],
    ),
  );

  // 4c. noteHits — tsvector-only, should be index-backed
  results.push(
    await explain(
      client,
      "noteHits (notes.search_tsv @@ tsquery)",
      `SELECT n.id, ts_rank(n.search_tsv, to_tsquery('english', $1)) AS rank
       FROM notes n WHERE n.search_tsv @@ to_tsquery('english', $1) AND n.deleted_at IS NULL`,
      [tsq],
    ),
  );

  // 4d. graph typeahead — ILIKE '%q%' on contacts.name (no trigram index)
  results.push(
    await explain(
      client,
      "graph typeahead (contacts.name ILIKE '%q%')",
      `SELECT c.id, c.name FROM contacts c
       WHERE c.name ILIKE $1
       ORDER BY (c.name ILIKE $2) DESC, c.name ASC LIMIT 8`,
      [`%${sampleWord}%`, `${sampleWord}%`],
    ),
  );

  // 4e. graph typeahead — companies.name ILIKE
  results.push(
    await explain(
      client,
      "graph typeahead (companies.name ILIKE '%q%')",
      `SELECT co.id, co.name FROM companies co
       WHERE co.name ILIKE $1
       ORDER BY (co.name ILIKE $2) DESC, co.name ASC LIMIT 8`,
      [`%${sampleWord}%`, `${sampleWord}%`],
    ),
  );

  console.log("\n=== SUMMARY ===");
  for (const r of results) console.log(`  ${r.label.padEnd(60)} exec=${r.exec}ms seqScans=${r.seqScans}`);

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
