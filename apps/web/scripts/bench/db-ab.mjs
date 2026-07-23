// Query-layer A/B against the hosted DB: the OLD keyword path (6 keyword
// queries + 1 identity lookup, issued serially on one connection — which is
// how they ran, since a single pooled client can't pipeline) vs the NEW single
// combined UNION ALL. Isolates the DB round-trip cost the fix removes from the
// per-request auth/connection overhead the end-to-end benchmark also includes.
//
// Run: node --env-file=.env.vercel scripts/bench/db-ab.mjs
import pg from "pg";
const { Client } = pg;
const DUMMY_USER_ID = "dummy-loadtest-user";

function pctl(a, p) { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]; }
async function timeit(fn, iters = 15) {
  const t = [];
  for (let i = 0; i < iters; i++) { const s = performance.now(); await fn(); t.push(performance.now() - s); }
  return { mean: t.reduce((a, b) => a + b, 0) / t.length, p50: pctl(t, 50), p95: pctl(t, 95), min: Math.min(...t) };
}
const fmt = (o) => `mean=${o.mean.toFixed(0)}ms p50=${o.p50.toFixed(0)}ms p95=${o.p95.toFixed(0)}ms min=${o.min.toFixed(0)}ms`;

const WORD = process.env.BENCH_WORD ?? "sharma";
const tsq = `${WORD}:*`;
const like = `%${WORD}%`;

async function oldPath(c) {
  // 6 keyword sources, each its own round-trip (Promise.all on one pooled
  // client still serialized — node-postgres has no pipelining), then identity.
  const ids = new Set();
  const collect = (rows) => rows.forEach((r) => r.contact_id && ids.add(r.contact_id));
  collect((await c.query(
    `SELECT c.id AS contact_id FROM contacts c LEFT JOIN companies co ON c.company_id=co.id
     WHERE c.search_tsv @@ to_tsquery('english',$1) OR co.search_tsv @@ to_tsquery('english',$1)
        OR c.emails::text ILIKE $2 OR c.phones::text ILIKE $2 OR c.links::text ILIKE $2 OR co.domain ILIKE $2
        OR word_similarity($3, lower(c.name)) > 0.3`, [tsq, like, WORD])).rows);
  collect((await c.query(`SELECT contact_id FROM notes WHERE contact_id IS NOT NULL AND deleted_at IS NULL AND search_tsv @@ to_tsquery('english',$1)`, [tsq])).rows);
  collect((await c.query(`SELECT contact_id FROM facts WHERE deleted_at IS NULL AND search_tsv @@ to_tsquery('english',$1)`, [tsq])).rows);
  collect((await c.query(`SELECT contact_id FROM follow_ups WHERE status='open' AND search_tsv @@ to_tsquery('english',$1)`, [tsq])).rows);
  collect((await c.query(`SELECT ec.contact_id FROM event_contacts ec JOIN events ev ON ev.id=ec.event_id WHERE ev.search_tsv @@ to_tsquery('english',$1)`, [tsq])).rows);
  collect((await c.query(`SELECT contact_id FROM signals WHERE status='new' AND search_tsv @@ to_tsquery('english',$1)`, [tsq])).rows);
  if (ids.size > 0) {
    await c.query(`SELECT c.id, c.name, c.title, co.name AS company_name FROM contacts c LEFT JOIN companies co ON c.company_id=co.id WHERE c.id = ANY($1)`, [[...ids]]);
  }
}

async function newPath(c) {
  await c.query(
    `SELECT contact_id, source, rank, trigram_match, snippet, c_name, c_title, c_company_name FROM (
       SELECT c.id AS contact_id, 'identity' AS source,
         (ts_rank(c.search_tsv, to_tsquery('english',$1)) + coalesce(ts_rank(co.search_tsv, to_tsquery('english',$1)),0) + word_similarity($3, lower(c.name))) AS rank,
         (c.emails::text ILIKE $2 OR c.phones::text ILIKE $2 OR c.links::text ILIKE $2 OR co.domain ILIKE $2) AS trigram_match,
         NULL::text AS snippet, c.name AS c_name, c.title AS c_title, co.name AS c_company_name
       FROM contacts c LEFT JOIN companies co ON c.company_id=co.id
       WHERE c.search_tsv @@ to_tsquery('english',$1) OR co.search_tsv @@ to_tsquery('english',$1)
          OR c.emails::text ILIKE $2 OR c.phones::text ILIKE $2 OR c.links::text ILIKE $2 OR co.domain ILIKE $2
          OR word_similarity($3, lower(c.name)) > 0.3
       UNION ALL SELECT n.contact_id,'notes',ts_rank(n.search_tsv, to_tsquery('english',$1)),false,ts_headline('english',n.body,to_tsquery('english',$1)),c.name,c.title,co.name FROM notes n JOIN contacts c ON c.id=n.contact_id LEFT JOIN companies co ON c.company_id=co.id WHERE n.contact_id IS NOT NULL AND n.deleted_at IS NULL AND n.search_tsv @@ to_tsquery('english',$1)
       UNION ALL SELECT f.contact_id,'facts',ts_rank(f.search_tsv, to_tsquery('english',$1)),false,ts_headline('english',f.text,to_tsquery('english',$1)),c.name,c.title,co.name FROM facts f JOIN contacts c ON c.id=f.contact_id LEFT JOIN companies co ON c.company_id=co.id WHERE f.deleted_at IS NULL AND f.search_tsv @@ to_tsquery('english',$1)
       UNION ALL SELECT fu.contact_id,'followups',ts_rank(fu.search_tsv, to_tsquery('english',$1)),false,fu.action,c.name,c.title,co.name FROM follow_ups fu JOIN contacts c ON c.id=fu.contact_id LEFT JOIN companies co ON c.company_id=co.id WHERE fu.status='open' AND fu.search_tsv @@ to_tsquery('english',$1)
       UNION ALL SELECT ec.contact_id,'events',ts_rank(ev.search_tsv, to_tsquery('english',$1)),false,ev.name,c.name,c.title,co.name FROM event_contacts ec JOIN events ev ON ev.id=ec.event_id JOIN contacts c ON c.id=ec.contact_id LEFT JOIN companies co ON c.company_id=co.id WHERE ev.search_tsv @@ to_tsquery('english',$1)
       UNION ALL SELECT s.contact_id,'signals',ts_rank(s.search_tsv, to_tsquery('english',$1)),false,s.headline,c.name,c.title,co.name FROM signals s JOIN contacts c ON c.id=s.contact_id LEFT JOIN companies co ON c.company_id=co.id WHERE s.status='new' AND s.search_tsv @@ to_tsquery('english',$1)
     ) m`, [tsq, like, WORD]);
}

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  await c.query("SELECT set_config('app.current_user_id',$1,false)", [DUMMY_USER_ID]);
  await oldPath(c); await newPath(c); // warm
  console.log(`word="${WORD}"`);
  console.log(`OLD (7 serial round-trips):  ${fmt(await timeit(() => oldPath(c)))}`);
  console.log(`NEW (1 combined round-trip): ${fmt(await timeit(() => newPath(c)))}`);
  await c.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
