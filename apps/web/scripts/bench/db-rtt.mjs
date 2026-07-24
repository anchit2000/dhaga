// Measures round-trip latency to the hosted DB, and — crucially — the cost of
// N *serial* round-trips on a single connection vs the same N issued via
// Promise.all on that one connection. node-postgres does not pipeline, so
// Promise.all on ONE connection still serializes: this shows whether the
// search's 6 "concurrent" keyword queries actually pay 6 RTTs.
//
// Run: node --env-file=.env.vercel scripts/bench/db-rtt.mjs
import pg from "pg";
const { Client } = pg;

function pctl(arr, p) {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}
async function timeit(fn, iters = 20) {
  const t = [];
  for (let i = 0; i < iters; i++) {
    const s = performance.now();
    await fn();
    t.push(performance.now() - s);
  }
  return { mean: t.reduce((a, b) => a + b, 0) / t.length, p50: pctl(t, 50), p95: pctl(t, 95), min: Math.min(...t) };
}
const fmt = (o) => `mean=${o.mean.toFixed(0)}ms p50=${o.p50.toFixed(0)}ms p95=${o.p95.toFixed(0)}ms min=${o.min.toFixed(0)}ms`;

async function main() {
  const url = process.env.DATABASE_URL;
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query("SELECT 1"); // warm

  const one = await timeit(() => client.query("SELECT 1"));
  console.log(`1 round-trip (SELECT 1):              ${fmt(one)}`);

  const seven = await timeit(async () => {
    for (let i = 0; i < 7; i++) await client.query("SELECT 1");
  });
  console.log(`7 SERIAL round-trips (await loop):    ${fmt(seven)}`);

  const sevenPromiseAll = await timeit(async () => {
    await Promise.all(Array.from({ length: 7 }, () => client.query("SELECT 1")));
  });
  console.log(`7 via Promise.all on ONE connection:  ${fmt(sevenPromiseAll)}`);
  console.log(`  ^ if this ~= serial, Promise.all gives NO network concurrency on one conn.`);

  await client.end();
  console.log(`\nInterpretation: normal search issues ~6 keyword + 1 identity = 7 round-trips`);
  console.log(`on the single request-scoped connection. Estimated network floor ≈ 7 × p50(1 RTT).`);
}
main().catch((e) => { console.error(e); process.exit(1); });
