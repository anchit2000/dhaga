// Playwright benchmark harness for Dhaga's search features.
//
// Measures end-to-end / server-side latency of three search surfaces against a
// RUNNING dev server, to capture a performance baseline (and re-run later to
// verify improvement). It does NOT start/stop the server.
//
// Usage (dev server must already be running, e.g. at http://localhost:3010):
//   cd apps/web && node scripts/bench/search-bench.mjs
//
// Config via env (all optional):
//   BASE_URL  default http://localhost:3010
//   EMAIL     default loadtest@dhaga.internal
//   PASSWORD  default LoadTest-Dummy-2026!
//   OUT       default apps/web/scripts/bench/.output/baseline.json
//   LABEL     default "baseline"  (stored in the JSON)
//
// Three categories:
//   1. Normal Search  — the "Search" tab (a Next.js Server Action POST). We
//      isolate server processing from the 300ms client debounce by timing the
//      matching server-action response via response.request().timing()
//      (responseEnd - requestStart).
//   2. Graph Typeahead — GET /api/graph/targets?q=… hit directly with the
//      browser's authenticated cookies (page.request.get). Wall-clock timed.
//   3. AI Search ("Ask Dhaga") — EXPENSIVE, metered, calls Anthropic. Kept
//      tiny: 2 queries, 1 iteration each. Server-action POST timing.

import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const BASE = (process.env.BASE_URL ?? "http://localhost:3010").replace(/\/+$/, "");
const EMAIL = process.env.EMAIL ?? "loadtest@dhaga.internal";
const PASSWORD = process.env.PASSWORD ?? "LoadTest-Dummy-2026!";
const OUT = resolve(process.env.OUT ?? "scripts/bench/.output/baseline.json");
const LABEL = process.env.LABEL ?? "baseline";

const TERMS = ["neel", "maria", "joshi", "verma", "desai", "sharma", "gmail", "singh"];
const AI_QUERIES = ["who works at a startup", "people I met recently"];

const NORMAL_WARMUP = 2;
const NORMAL_ITERS = 8;
const TYPEAHEAD_ITERS = 8;
const RESPONSE_TIMEOUT_MS = 8000;
// The search action can take ~13s to FAIL (10s tenant-pool connect timeout) —
// wait long enough to observe either a success or that failure.
const NORMAL_ACTION_TIMEOUT_MS = 20_000;

// ---------- stats helpers ----------

function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0];
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function summarize(samples) {
  const clean = samples.filter((n) => typeof n === "number" && Number.isFinite(n));
  if (clean.length === 0) {
    return { mean: null, p50: null, p95: null, min: null, samples: 0 };
  }
  const sorted = [...clean].sort((a, b) => a - b);
  const mean = clean.reduce((a, b) => a + b, 0) / clean.length;
  return {
    mean: round(mean),
    p50: round(percentile(sorted, 50)),
    p95: round(percentile(sorted, 95)),
    min: round(sorted[0]),
    samples: clean.length,
  };
}

function round(n) {
  return n === null ? null : Math.round(n * 100) / 100;
}

/** Pool all per-term samples into one overall summary. */
function overallFromPerTerm(perTerm) {
  const all = [];
  for (const term of Object.keys(perTerm)) {
    const raw = perTerm[term]._rawSamples ?? [];
    all.push(...raw);
  }
  const s = summarize(all);
  return { mean: s.mean, p50: s.p50, p95: s.p95, min: s.min };
}

// ---------- server-action response detection ----------
//
// Next 16 Server Actions POST to the current page URL and carry a lowercase
// `next-action` request header. We match responses whose request is a POST
// carrying that header. Timing comes from response.request().timing():
// responseEnd - requestStart isolates the server round-trip from the client
// debounce (the request only starts firing after the 300ms debounce elapses,
// and timing() clocks from requestStart, i.e. when the request is actually
// dispatched — not when the user typed).

function isServerActionResponse(response) {
  const req = response.request();
  if (req.method() !== "POST") return false;
  const headers = req.headers();
  return "next-action" in headers;
}

function actionTimingMs(response) {
  const t = response.request().timing();
  if (!t || t.requestStart < 0 || t.responseEnd < 0) return null;
  return t.responseEnd - t.requestStart;
}

// ---------- login ----------

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 30_000 });
  await page.fill("input#email", EMAIL);
  await page.fill("input#password", PASSWORD);
  await page.click('button[type="submit"]');
  // 15s per spec is fine warm, but the /app route's first cold Turbopack
  // compile in dev can exceed it — allow more so the harness is robust.
  await page.waitForURL(/\/app/, { timeout: 60_000 });
  // Best-effort: surface a contact count if the app home shows one.
  let count = null;
  try {
    const bodyText = await page.locator("body").innerText({ timeout: 3000 });
    const m = bodyText.match(/(\d[\d,]*)\s+(?:contacts?|people)/i);
    if (m) count = m[1];
  } catch {
    /* ignore */
  }
  if (count) {
    console.log(`✓ Logged in — reached /app (contacts visible: ${count})`);
  } else {
    console.log("✓ Logged in — reached /app");
  }
}

// ---------- palette helpers ----------

async function openPalette(page) {
  const input = page.locator('form[role="search"] input[name="q"]');
  // Already open? (e.g. left open by a prior step) — reuse it.
  if (await input.isVisible().catch(() => false)) return input;
  // Wait for the nav trigger to exist first — this both confirms the palette
  // is hydrated (so the global Ctrl+K listener is attached) and gives us a
  // reliable click fallback if the keyboard shortcut is missed.
  const trigger = page.locator('button[aria-label="Search your network"]');
  await trigger.waitFor({ state: "visible", timeout: 15_000 });
  await page.keyboard.press("Control+K");
  try {
    await input.waitFor({ state: "visible", timeout: 2000 });
    return input;
  } catch {
    /* fall through to explicit click */
  }
  await trigger.click();
  await input.waitFor({ state: "visible", timeout: 5000 });
  return input;
}

async function closePalette(page) {
  await page.keyboard.press("Escape").catch(() => {});
  await page
    .locator('form[role="search"] input[name="q"]')
    .waitFor({ state: "hidden", timeout: 3000 })
    .catch(() => {});
}

/** A search-action HTTP 500 replaces the /app shell with Next's dev error
 *  overlay (the nav trigger disappears), so after one we reload to restore a
 *  usable page before the next attempt. */
async function recoverApp(page) {
  await page.goto(`${BASE}/app`, { waitUntil: "load", timeout: 60_000 }).catch(() => {});
}

/** Count rendered result rows. The palette is a modal Dialog (role="dialog")
 *  and SearchResults renders each hit as <li><Link href="/app/people/:id">. */
async function resultRowCount(page) {
  try {
    return await page.locator('[role="dialog"] a[href^="/app/people/"]').count();
  } catch {
    return null;
  }
}

// ---------- category 1: normal search ----------

async function benchNormalSearch(page) {
  console.log("\n[1/3] Normal Search (Server Action)…");
  await openPalette(page);
  // Ensure the Search tab is active (default). Click it if present, ignore.
  try {
    await page.getByRole("tab", { name: /^search$/i }).click({ timeout: 1500 });
  } catch {
    /* default already */
  }

  const perTerm = {};
  const failures = [];
  let totalSuccess = 0;
  let termsAttempted = 0;

  for (const term of TERMS) {
    // Early-abort: if the first couple of terms produced zero successful
    // responses, the action is deterministically failing — record the rest as
    // skipped rather than grinding ~13s/attempt through every term.
    if (termsAttempted >= 2 && totalSuccess === 0) {
      failures.push({ term, status: "skipped", note: "aborted after repeated failures" });
      console.log(`   · "${term}": skipped (search action failing — see error)`);
      continue;
    }
    termsAttempted++;

    const samples = [];
    let lastResultCount = null;
    let termFailure = null;

    // fill() selects-all and replaces, so no explicit clear is needed. React's
    // onChange only re-dispatches when the value actually changes, so we
    // alternate a trailing space each iteration to guarantee a fresh dispatch.
    const total = NORMAL_WARMUP + NORMAL_ITERS;
    for (let i = 0; i < total; i++) {
      const counted = i >= NORMAL_WARMUP;
      const value = i % 2 === 0 ? term : `${term} `;
      // Re-resolve the input each iteration — the Base UI Input re-renders on
      // action-state transitions and a stale handle can detach mid-fill.
      let input = page.locator('form[role="search"] input[name="q"]');
      if (!(await input.isVisible().catch(() => false))) {
        await openPalette(page).catch(() => {});
        input = page.locator('form[role="search"] input[name="q"]');
      }
      const t0 = Date.now();
      const waitResp = page
        .waitForResponse(isServerActionResponse, { timeout: NORMAL_ACTION_TIMEOUT_MS })
        .catch(() => null);
      try {
        await input.fill(value, { timeout: 5000 });
      } catch {
        // Input detached — a prior 500 likely tore down the shell. Recover.
        await waitResp;
        await recoverApp(page);
        await openPalette(page).catch(() => {});
        continue;
      }
      const response = await waitResp;
      const wall = Date.now() - t0;
      if (!response) {
        termFailure = { status: "no-response", ms: wall };
        break;
      }
      const status = response.status();
      if (status !== 200) {
        const snippet = (await response.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 160);
        termFailure = { status, ms: wall, snippet };
        await recoverApp(page); // 500 tears down the /app shell
        break;
      }
      // On success prefer the server-action network timing; fall back to wall.
      const ms = actionTimingMs(response) ?? wall;
      if (counted) {
        samples.push(ms);
        totalSuccess++;
      }
      await page.waitForTimeout(50);
      if (counted) lastResultCount = await resultRowCount(page);
    }

    if (samples.length > 0) {
      const s = summarize(samples);
      perTerm[term] = { ...s, resultCount: lastResultCount, _rawSamples: samples };
      console.log(
        `   · "${term}": mean=${s.mean}ms p50=${s.p50}ms p95=${s.p95}ms ` +
          `min=${s.min}ms n=${s.samples} rows=${lastResultCount ?? "?"}`,
      );
    } else {
      const f = { term, ...(termFailure ?? { status: "unknown" }) };
      failures.push(f);
      console.log(
        `   · "${term}": FAILED status=${f.status} ~${f.ms ?? "?"}ms` +
          (f.snippet ? ` — ${f.snippet.slice(0, 90)}` : ""),
      );
      await openPalette(page).catch(() => {}); // ready the palette for the next term
    }
  }

  await closePalette(page);

  let error = null;
  if (totalSuccess === 0 && failures.length > 0) {
    const first = failures.find((f) => f.status === 500);
    error = first
      ? "Search server action returns HTTP 500 — 'timeout exceeded when trying to connect' " +
        "in openTenantConnection. hybridSearch (lib/repo/search/index.ts) fans out 6 parallel " +
        "keyword sub-queries, each opening its own tenant connection and oversubscribing the " +
        "max-3 tenant pool (packages/ee/src/db/pool.ts) until the 10s connect timeout. The REST " +
        "typeahead uses a single connection and is unaffected. See failures[]."
      : "Search server action returned no successful responses. See failures[].";
    console.log(`   ! Normal search FAILED for all terms — ${error}`);
  }

  // strip internal raw arrays from the persisted shape
  const overall = overallFromPerTerm(perTerm);
  const cleanPerTerm = {};
  for (const [term, v] of Object.entries(perTerm)) {
    const { _rawSamples, ...rest } = v;
    cleanPerTerm[term] = rest;
  }
  return { perTerm: cleanPerTerm, overall, failures, error };
}

// ---------- category 2: graph typeahead ----------

async function benchGraphTypeahead(page) {
  console.log("\n[2/3] Graph Typeahead (GET /api/graph/targets)…");
  const perTerm = {};

  for (const term of TERMS) {
    const samples = [];
    let status = null;
    let resultCount = null;
    // 2 warmups + counted iterations, mirroring the normal-search shape.
    for (let i = 0; i < 2 + TYPEAHEAD_ITERS; i++) {
      const counted = i >= 2;
      const url = `${BASE}/api/graph/targets?q=${encodeURIComponent(term)}`;
      const start = performance.now();
      let resp;
      try {
        resp = await page.request.get(url, { timeout: RESPONSE_TIMEOUT_MS });
      } catch {
        continue;
      }
      const elapsed = performance.now() - start;
      status = resp.status();
      if (counted) {
        samples.push(elapsed);
        try {
          const body = await resp.json();
          resultCount = Array.isArray(body?.targets) ? body.targets.length : null;
        } catch {
          resultCount = null;
        }
      }
    }
    if (samples.length === 0) {
      console.log(`   · "${term}": no response — skipped`);
      continue;
    }
    const s = summarize(samples);
    perTerm[term] = { ...s, status, resultCount, _rawSamples: samples };
    console.log(
      `   · "${term}": mean=${s.mean}ms p50=${s.p50}ms p95=${s.p95}ms ` +
        `min=${s.min}ms n=${s.samples} status=${status} rows=${resultCount ?? "?"}`,
    );
  }

  const overall = overallFromPerTerm(perTerm);
  const cleanPerTerm = {};
  for (const [term, v] of Object.entries(perTerm)) {
    const { _rawSamples, ...rest } = v;
    cleanPerTerm[term] = rest;
  }
  return { perTerm: cleanPerTerm, overall };
}

// ---------- category 3: AI search ----------

async function benchAiSearch(page) {
  console.log("\n[3/3] AI Search (Ask Dhaga — metered, small)…");
  const results = [];

  for (const query of AI_QUERIES) {
    let latencyMs = null;
    let ok = false;
    let status = null;
    try {
      await openPalette(page);
      const input = page.locator('form[role="search"] input[name="q"]');
      // Switch to the "Ask Dhaga" tab.
      await page.getByRole("tab", { name: /ask dhaga/i }).click({ timeout: 3000 });
      await input.fill(query, { timeout: 5000 });
      const t0 = Date.now();
      const waitResp = page
        .waitForResponse(isServerActionResponse, { timeout: 30_000 })
        .catch(() => null);
      // Ask never fires on keystroke — submit explicitly via the "Ask Dhaga" button.
      await page.getByRole("button", { name: /ask dhaga/i }).click({ timeout: 3000 });
      const response = await waitResp;
      const wall = Date.now() - t0;
      if (response) {
        status = response.status();
        latencyMs = round(actionTimingMs(response) ?? wall);
        if (status === 200) {
          // Confirm an answer (or notice) actually rendered.
          ok = await page
            .locator('[role="dialog"] p.whitespace-pre-wrap')
            .first()
            .waitFor({ state: "visible", timeout: 5000 })
            .then(() => true)
            .catch(() => false);
        } else {
          await recoverApp(page); // a 500 tears down the /app shell
        }
      }
      console.log(`   · "${query}": latency=${latencyMs ?? "n/a"}ms status=${status ?? "n/a"} ok=${ok}`);
    } catch (err) {
      console.log(`   · "${query}": failed — ${err.message}`);
    }
    results.push({ query, latencyMs, ok, status });
    await page.waitForTimeout(500);
  }

  return results;
}

// ---------- printing ----------

function printSummary(out) {
  const line = "─".repeat(64);
  console.log(`\n${line}`);
  console.log(`BENCH SUMMARY  (label="${out.label}")`);
  console.log(`base=${out.baseUrl}  at=${out.timestamp}`);
  console.log(line);

  const row = (name, o) =>
    o
      ? `${name.padEnd(18)} mean=${String(o.mean).padStart(8)}ms  ` +
        `p50=${String(o.p50).padStart(8)}ms  p95=${String(o.p95).padStart(8)}ms`
      : `${name.padEnd(18)} (no data)`;

  console.log(row("Normal Search", out.normalSearch?.overall));
  if (out.normalSearch?.error) {
    console.log(`  ⚠ Normal Search failing: ${out.normalSearch.error}`);
  }
  console.log(row("Graph Typeahead", out.graphTypeahead?.overall));
  console.log(line);
  console.log("AI Search:");
  for (const r of out.aiSearch ?? []) {
    console.log(
      `  "${r.query}" → ${r.latencyMs ?? "n/a"}ms  ok=${r.ok}`,
    );
  }
  console.log(line);
}

// ---------- main ----------

async function main() {
  await mkdir(dirname(OUT), { recursive: true });

  const out = {
    label: LABEL,
    timestamp: new Date().toISOString(),
    baseUrl: BASE,
    normalSearch: null,
    graphTypeahead: null,
    aiSearch: [],
  };

  let browser;
  try {
    browser = await chromium.launch();
  } catch (err) {
    console.error(
      `Could not launch Chromium — Playwright's chromium binary must be installed.\n${err.message}`,
    );
    process.exit(1);
  }

  const context = await browser.newContext({ colorScheme: "dark" });
  const page = await context.newPage();

  try {
    await login(page);
  } catch (err) {
    console.error(`FATAL: login failed — ${err.message}`);
    await browser.close();
    process.exit(1);
  }

  // Each category is isolated so one failure doesn't abort the others.
  try {
    out.normalSearch = await benchNormalSearch(page);
  } catch (err) {
    console.error(`Normal Search category failed: ${err.message}`);
  }

  try {
    out.graphTypeahead = await benchGraphTypeahead(page);
  } catch (err) {
    console.error(`Graph Typeahead category failed: ${err.message}`);
  }

  try {
    out.aiSearch = await benchAiSearch(page);
  } catch (err) {
    console.error(`AI Search category failed: ${err.message}`);
  }

  await browser.close();

  await writeFile(OUT, JSON.stringify(out, null, 2), "utf8");
  printSummary(out);
  console.log(`\n✓ Wrote results to ${OUT}`);
}

main().catch((err) => {
  console.error(`Unexpected fatal error: ${err.stack || err.message}`);
  process.exit(1);
});
