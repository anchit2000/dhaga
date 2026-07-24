// Hosted spot-check for the connection-fan-out fixes. Logs in as the load-test
// user and drives the fixed endpoints, asserting 200 (not the pre-fix 500 /
// pool-exhaustion). The /api/contacts/[id]/network route is hit both singly and
// as a concurrent burst (its old failure mode was two concurrent same-tenant
// requests deadlocking the max-3 pool). Needs the hosted dev server on :3010.
//
// Run (from apps/web): node scripts/bench/spot-check-fixes.mjs
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3010";
const EMAIL = process.env.EMAIL ?? "loadtest@dhaga.internal";
const PASSWORD = process.env.PASSWORD ?? "LoadTest-Dummy-2026!";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const fails = [];

  await page.goto(`${BASE}/login`);
  await page.fill("input#email", EMAIL);
  await page.fill("input#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/app/, { timeout: 60000 });
  console.log("✓ logged in");

  // A real contact id: CONTACT_ID env, else the typeahead route.
  let contactId = process.env.CONTACT_ID;
  if (!contactId) {
    const t = await page.request.get(`${BASE}/api/graph/targets?q=mar`);
    const targets = await t.json();
    const list = Array.isArray(targets) ? targets : targets.results ?? [];
    contactId = (list.find?.((x) => x.kind === "contact") ?? list[0])?.id;
  }
  if (!contactId) throw new Error("no contact id (set CONTACT_ID env)");
  console.log(`✓ using contact ${contactId}`);

  const check = async (label, url) => {
    const res = await page.request.get(url);
    const ok = res.status() === 200;
    console.log(`${ok ? "✓" : "✗"} ${label}: ${res.status()}`);
    if (!ok) fails.push(`${label} -> ${res.status()} ${(await res.text()).slice(0, 200)}`);
    return ok;
  };

  // Network route — the two sections, singly.
  await check("network?section=connections", `${BASE}/api/contacts/${contactId}/network?section=connections`);
  await check("network?section=nearby", `${BASE}/api/contacts/${contactId}/network?section=nearby&intent=general`);

  // Concurrency burst: the old fan-out pinned ~3 connections per request, so
  // several concurrent same-tenant requests deadlocked the max-3 pool.
  const burst = await Promise.all(
    Array.from({ length: 6 }, (_, i) =>
      page.request
        .get(`${BASE}/api/contacts/${contactId}/network?section=${i % 2 ? "nearby" : "connections"}`)
        .then((r) => r.status()),
    ),
  );
  const allOk = burst.every((s) => s === 200);
  console.log(`${allOk ? "✓" : "✗"} concurrent burst (6): statuses=${burst.join(",")}`);
  if (!allOk) fails.push(`concurrent burst had non-200: ${burst.join(",")}`);

  await browser.close();
  if (fails.length) {
    console.log("\nFAILURES:\n" + fails.join("\n"));
    process.exit(1);
  }
  console.log("\nALL GOOD — fixed endpoints return 200, including under concurrency.");
}
main().catch((e) => { console.error(e); process.exit(1); });
