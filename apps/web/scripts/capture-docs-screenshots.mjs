// Capture product screenshots of the Dhaga web app for the user-guide docs.
//
// Requires a dev server running against the Supabase DB on port 3010 and the
// seeded load-test user (see CLAUDE.md "Local / E2E testing").
//
//   node scripts/capture-docs-screenshots.mjs
//
// Writes PNGs into public/docs/guide/ and prints a JSON manifest to stdout.

import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const BASE = (process.env.BASE_URL ?? "http://localhost:3010").replace(/\/+$/, "");
const EMAIL = "loadtest@dhaga.internal";
const PASSWORD = "LoadTest-Dummy-2026!";
// Rich contact (has facts) + event (most attendees), picked from the seeded DB.
const CONTACT_ID = process.env.CONTACT_ID ?? "cac61513-340b-4c32-89e6-ab96a6d18023";
const EVENT_ID = process.env.EVENT_ID ?? "7f13a1f7-2f6d-48f3-a8ed-e5eaeec8d673";

const OUT_DIR = resolve("public/docs/guide");
const manifest = [];

// Optional allow-list: `ONLY=a.png,b.png` regenerates just those files (keeps
// the rest untouched — handy when adding a few new shots without re-shooting all).
const ONLY = process.env.ONLY ? new Set(process.env.ONLY.split(",").map((s) => s.trim())) : null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/app**", { timeout: 45_000 });
  await page.waitForLoadState("networkidle").catch(() => {});
}

// Wait for the Sigma/WebGL canvas to mount and the layout to settle.
async function waitForGraph(page) {
  await page.waitForSelector("canvas", { timeout: 30_000 });
  await sleep(5000);
}

async function shoot(file) {
  await page.screenshot({ path: resolve(OUT_DIR, file) });
}

async function capture(file, route, shows, fn) {
  if (ONLY && !ONLY.has(file)) return;
  try {
    await fn();
    await shoot(file);
    manifest.push({ file, ok: true, route, shows });
    console.log(`  ok   ${file}`);
  } catch (err) {
    manifest.push({ file, ok: false, route, shows, error: String(err?.message ?? err) });
    console.log(`  WARN ${file}: ${err?.message ?? err}`);
  }
}

await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  colorScheme: "dark",
  reducedMotion: "reduce",
});
const page = await context.newPage();

await login(page);

// 1. home.png — daily briefing dashboard
await capture("home.png", "/app", "The daily briefing dashboard (home) after login.", async () => {
  await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
  await sleep(1500);
  await page.evaluate(() => window.scrollTo(0, 0));
});

// 2. graph-overview.png — full network canvas
await capture("graph-overview.png", "/app/graph", "The full knowledge-graph network canvas with the warm-path panel on top.", async () => {
  await page.goto(`${BASE}/app/graph`, { waitUntil: "domcontentloaded" });
  await waitForGraph(page);
});

// 3. graph-warm-path.png — Warm path panel with an intro-chain result
await capture("graph-warm-path.png", "/app/graph", "The Warm path panel with a name searched and an intro-chain result rendered.", async () => {
  await page.goto(`${BASE}/app/graph`, { waitUntil: "domcontentloaded" });
  await waitForGraph(page);
  const input = page.getByLabel("Warm path target");
  await input.click();
  await input.fill("");
  await input.type("a", { delay: 60 });
  // Wait for the target-search dropdown, pick the first result.
  await page.waitForSelector("ul li button", { timeout: 8000 });
  await page.locator("ul li button").first().click();
  await page.getByRole("button", { name: "Find path" }).click();
  // Wait for either an intro-chain row (amber card with "You" chip) or a message.
  await page.waitForTimeout(3500);
  await page.evaluate(() => window.scrollTo(0, 0));
});

// 4. graph-node-panel.png — a node selected via ?focus=, NodePanel side sheet open
let nodePanelShown = false;
await capture("graph-node-panel.png", `/app/graph?focus=${CONTACT_ID}`, "A focused contact node with the NodePanel side sheet open showing its edges/relationships.", async () => {
  await page.goto(`${BASE}/app/graph?focus=${CONTACT_ID}`, { waitUntil: "domcontentloaded" });
  await waitForGraph(page);
  await sleep(3000);
  await page.waitForSelector('[role="dialog"]', { timeout: 8000 });
  nodePanelShown = true;
  await sleep(500);
});
// Fallback: if the node panel never opened, capture the Layers panel instead.
if (!nodePanelShown) {
  await capture("graph-node-panel.png", `/app/graph?focus=${CONTACT_ID}`, "FALLBACK: Layers panel open (node panel could not be opened reliably).", async () => {
    await page.goto(`${BASE}/app/graph`, { waitUntil: "domcontentloaded" });
    await waitForGraph(page);
    // Open the Layers panel (top-left).
    await page.getByRole("button", { name: /layer/i }).first().click().catch(() => {});
    await sleep(800);
  });
}

// 5. people-list.png — the People table
await capture("people-list.png", "/app/people", "The People table listing seeded contacts.", async () => {
  await page.goto(`${BASE}/app/people`, { waitUntil: "networkidle" });
  await sleep(1000);
});

// 6. add-person.png — manual add form
await capture("add-person.png", "/app/people/new", "The manual add-person form.", async () => {
  await page.goto(`${BASE}/app/people/new`, { waitUntil: "networkidle" });
  await sleep(800);
});

// 7. person-detail.png — full profile top
await capture("person-detail.png", `/app/people/${CONTACT_ID}`, "A contact profile page (top) with header, brief, and info card.", async () => {
  await page.goto(`${BASE}/app/people/${CONTACT_ID}`, { waitUntil: "networkidle" });
  await sleep(1200);
  await page.evaluate(() => window.scrollTo(0, 0));
});

// 8. person-facts-enrich.png — Facts section + Enrich button both visible
await capture("person-facts-enrich.png", `/app/people/${CONTACT_ID}`, "The Facts section and the 'Enrich from public web ✦' button visible together.", async () => {
  await page.goto(`${BASE}/app/people/${CONTACT_ID}`, { waitUntil: "networkidle" });
  await sleep(1000);
  const enrich = page.getByRole("button", { name: /Enrich from public web/i });
  await enrich.scrollIntoViewIfNeeded();
  // Nudge up so the "Facts" heading above the list is also in frame.
  await page.evaluate(() => window.scrollBy(0, -180));
  await sleep(500);
});

// 9. quick-add-paste.png — default paste-text mode
await capture("quick-add-paste.png", "/app/quick-add", "The quick-add page in default paste-text mode with the capture textarea.", async () => {
  await page.goto(`${BASE}/app/quick-add`, { waitUntil: "networkidle" });
  await sleep(800);
});

// 10. quick-add-capture.png — capture options (card photo / camera / upload / voice)
await capture("quick-add-capture.png", "/app/quick-add", "The quick-add capture options after switching to Card photo mode (camera/upload) with the voice dock.", async () => {
  await page.goto(`${BASE}/app/quick-add`, { waitUntil: "networkidle" });
  await sleep(600);
  await page.getByRole("button", { name: "Card photo" }).click();
  await sleep(700);
});

// 11. events-list.png — Events table + inline Create-event form (color/emoji picker)
await capture("events-list.png", "/app/events", "The Events page with the inline Create-event form (color/emoji picker) and the events table.", async () => {
  await page.goto(`${BASE}/app/events`, { waitUntil: "networkidle" });
  await sleep(900);
  await page.evaluate(() => window.scrollTo(0, 0));
});

// 12. event-detail.png — roster + add-people search
await capture("event-detail.png", `/app/events/${EVENT_ID}`, "An event page showing the people roster and the 'Add people' search input.", async () => {
  await page.goto(`${BASE}/app/events/${EVENT_ID}`, { waitUntil: "networkidle" });
  await sleep(1000);
  await page.getByPlaceholder(/Add people/i).click().catch(() => {});
  await sleep(400);
  await page.evaluate(() => window.scrollTo(0, 0));
});

// 13. entities-list.png
await capture("entities-list.png", "/app/entities", "The Entities list page.", async () => {
  await page.goto(`${BASE}/app/entities`, { waitUntil: "networkidle" });
  await sleep(800);
});

// 14. settings.png — top of settings
await capture("settings.png", "/app/settings", "The Settings page (top).", async () => {
  await page.goto(`${BASE}/app/settings`, { waitUntil: "networkidle" });
  await sleep(900);
  await page.evaluate(() => window.scrollTo(0, 0));
});

// 14b. import-contacts.png — the Import contacts panel (file dropzone + per-source steps)
await capture("import-contacts.png", "/app/import", "The Import contacts screen: the .vcf/CSV file dropzone and the per-source export instructions (OAuth Connect buttons only render when provider env creds are configured).", async () => {
  await page.goto(`${BASE}/app/import`, { waitUntil: "networkidle" });
  await page.waitForURL("**/app/settings**", { timeout: 15_000 }).catch(() => {});
  await sleep(900);
  const section = page.locator("#import");
  await section.scrollIntoViewIfNeeded();
  await sleep(500);
});

// 15. search-palette.png — command palette (Ctrl+K) with a query + results
await capture("search-palette.png", "/app (⌘K)", "The command palette opened with a 'founder' query showing search results.", async () => {
  await page.goto(`${BASE}/app`, { waitUntil: "networkidle" });
  await sleep(800);
  await page.keyboard.press("Control+KeyK");
  await page.waitForSelector('[role="dialog"] input[name="q"]', { timeout: 8000 });
  await page.fill('[role="dialog"] input[name="q"]', "founder");
  await sleep(2500);
});

// 16. ask-dhaga.png — command palette switched to the Ask Dhaga tab
await capture("ask-dhaga.png", "/app (⌘K → Ask)", "The command palette on the 'Ask Dhaga' tab (natural-language question interface).", async () => {
  // Palette should still be open from the previous step; reopen if needed.
  const open = await page.locator('[role="dialog"] input[name="q"]').count();
  if (!open) {
    await page.keyboard.press("Control+KeyK");
    await page.waitForSelector('[role="dialog"] input[name="q"]', { timeout: 8000 });
  }
  await page.getByRole("tab", { name: /Ask Dhaga/i }).click();
  await sleep(1200);
});

// 17. people-bulk-actions.png — rows selected + the bulk-action bar
await capture("people-bulk-actions.png", "/app/people", "The People table with several rows selected and the bulk-action bar (Merge, Add to company, Tag, Star/Unstar, Delete) above it.", async () => {
  await page.goto(`${BASE}/app/people`, { waitUntil: "networkidle" });
  await sleep(1000);
  const boxes = page.getByRole("checkbox", { name: "Select row" });
  for (const i of [0, 1, 2]) await boxes.nth(i).click();
  await page.getByText(/\d+ selected/).first().waitFor({ timeout: 8000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);
});

// 18. people-duplicates.png — duplicate-contact clusters
await capture("people-duplicates.png", "/app/people/duplicates", "The duplicate-contact suggestions page: clusters grouped by shared email / phone / similar name, each with Review & merge.", async () => {
  await page.goto(`${BASE}/app/people/duplicates`, { waitUntil: "networkidle" });
  await sleep(1200);
  await page.evaluate(() => window.scrollTo(0, 0));
});

// 19. companies-list.png — the Companies management table
await capture("companies-list.png", "/app/companies", "The Companies management page: companies with contact counts, plus create/rename/delete and multi-select for merge.", async () => {
  await page.goto(`${BASE}/app/companies`, { waitUntil: "networkidle" });
  await sleep(1000);
  await page.evaluate(() => window.scrollTo(0, 0));
});

// 20. companies-duplicates.png — duplicate-company clusters
await capture("companies-duplicates.png", "/app/companies/duplicates", "The duplicate-company suggestions page: companies clustered by normalized name (legal suffixes stripped), each with Review & merge.", async () => {
  await page.goto(`${BASE}/app/companies/duplicates`, { waitUntil: "networkidle" });
  await sleep(1200);
  await page.evaluate(() => window.scrollTo(0, 0));
});

await context.close();
await browser.close();

console.log("\nMANIFEST_JSON_START");
console.log(JSON.stringify(manifest, null, 2));
console.log("MANIFEST_JSON_END");

const failed = manifest.filter((m) => !m.ok);
if (failed.length) console.log(`\n${failed.length} FAILED: ${failed.map((f) => f.file).join(", ")}`);
else console.log("\nAll captures ok.");
