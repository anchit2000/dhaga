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
  // Resolve as soon as the /app navigation commits — waiting for the home route's
  // full "load"/networkidle can exceed the timeout on a cold cross-region DB and
  // while its WebGPU voice model downloads. A generous ceiling covers first-compile.
  await page.waitForURL("**/app**", { timeout: 120_000, waitUntil: "commit" });
  await page.waitForLoadState("domcontentloaded").catch(() => {});
}

// Wait for the Sigma/WebGL canvas to mount and the layout to settle.
async function waitForGraph(page) {
  await page.waitForSelector("canvas", { timeout: 30_000 });
  await sleep(5000);
}

// Quick add opens on the Manual surface (default since #116). The AI capture
// pills (Paste text / Card photo) live behind it, reached via "Back to capture".
// Leaves the page on the Paste-text tab with its note textarea focused-and-ready.
async function openPasteSurface(page) {
  await page.goto(`${BASE}/app/quick-add`, { waitUntil: "networkidle" });
  await sleep(800);
  const back = page.getByRole("button", { name: /Back to capture/i });
  if (await back.count()) await back.first().click();
  const pastePill = page.getByRole("button", { name: "Paste text" });
  if (await pastePill.count()) await pastePill.first().click();
  await page.getByPlaceholder(/Paste anything with a person/i).waitFor({ timeout: 8000 });
  await sleep(400);
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

// 9. quick-add-paste.png — the Paste-text tab. Manual is the default surface
// now (#116), so this switches to the Paste pill before shooting the textarea.
await capture("quick-add-paste.png", "/app/quick-add", "The quick-add Paste-text tab (reached from the default Manual surface) with the capture textarea.", async () => {
  await openPasteSurface(page);
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

// --- Shots for PRs #110/#112/#116/#118/#119 ----------------------------------

// 21. calendar.png — FullCalendar month view populated with follow-ups.
await capture("calendar.png", "/app/calendar", "The follow-up calendar: FullCalendar month view with dated follow-ups (overdue ones tinted amber) plus the draggable Unscheduled tray.", async () => {
  await page.goto(`${BASE}/app/calendar`, { waitUntil: "networkidle" });
  // FullCalendar is client-only (mounts after hydration); wait for a real event.
  await page.waitForSelector(".fc-daygrid-day", { timeout: 20_000 });
  await page.waitForSelector(".fc-event", { timeout: 20_000 });
  await sleep(900);
  await page.evaluate(() => window.scrollTo(0, 0));
});

// 22. quick-add-manual.png — the Manual hub (default surface since #116) with its
// three no-AI sub-tabs (Person / Relationship / Fact / follow-up).
await capture("quick-add-manual.png", "/app/quick-add", "The quick-add Manual hub (the default surface) with its Person / Relationship / Fact-or-follow-up sub-tabs.", async () => {
  await page.goto(`${BASE}/app/quick-add`, { waitUntil: "networkidle" });
  await page.getByRole("tablist", { name: /Manual quick add/i }).waitFor({ timeout: 10_000 });
  await sleep(700);
  await page.evaluate(() => window.scrollTo(0, 0));
});

// 23. ask-dhaga-rail.png — a reasoned Ask-Dhaga answer with its right-side
// source-contacts (receipts) rail. Driven live (metered Sonnet); opened from
// /app/people so it never mounts the home route's WebGPU voice model. Falls back
// to whatever the Ask panel shows if a live answer doesn't stream in time.
await capture("ask-dhaga-rail.png", "/app (⌘K → Ask Dhaga)", "An Ask-Dhaga answer with the right-side source-contacts (receipts) rail on wide screens.", async () => {
  await page.goto(`${BASE}/app/people`, { waitUntil: "networkidle" });
  await sleep(600);
  await page.keyboard.press("Control+KeyK");
  await page.waitForSelector('[role="dialog"] input[name="q"]', { timeout: 8000 });
  await page.getByRole("tab", { name: /Ask Dhaga/i }).click();
  await page.fill('[role="dialog"] input[name="q"]', "Who do I know in logistics, and how did I meet them?");
  await page.getByRole("button", { name: /Ask Dhaga/i }).click();
  // The two-pane rail (aside) appears once an answer starts streaming; then wait
  // for the receipt links to land. If neither arrives, shoot the panel anyway.
  const rail = await page
    .waitForSelector('[role="dialog"] aside', { timeout: 90_000 })
    .catch(() => null);
  if (rail) {
    await page
      .waitForSelector('[role="dialog"] aside a[href^="/app/people/"]', { timeout: 45_000 })
      .catch(() => {});
  } else {
    await page.waitForTimeout(3000);
  }
  await sleep(1500);
});

// 24. note-capture-confirm.png — the "Who is this note about?" (NoteSubjectCard)
// inline confirmation. Driven live: a captured note naming "Priya" (many
// matches) routes to the ambiguous-subject confirmation. Needs the metered LLM
// classifier, so the dev server runs with AI budget.
await capture("note-capture-confirm.png", "/app/quick-add (note capture)", "The inline 'Which Priya is this note about?' NoteSubjectCard: attach a captured note to an existing contact or create a new one.", async () => {
  await openPasteSurface(page);
  await page.fill(
    'textarea[name="raw"]',
    "Caught up with Priya over coffee this morning. She just closed her seed round and is hiring a founding engineer, and asked me for a warm intro to a fintech-focused angel. I should follow up next week with a couple of names.",
  );
  await page.getByRole("button", { name: /Extract contact/i }).click();
  // The classifier + candidate lookup produce the inline NoteSubjectCard, whose
  // "New contact name" input is unique to it.
  await page.getByLabel("New contact name").waitFor({ timeout: 75_000 });
  await sleep(900);
  await page.evaluate(() => window.scrollTo(0, 0));
});

// 25. calendar-event.png (optional) — the follow-up details dialog from a grid event.
await capture("calendar-event.png", "/app/calendar (event dialog)", "The follow-up details dialog opened from a calendar event (reschedule, mark done, open contact).", async () => {
  await page.goto(`${BASE}/app/calendar`, { waitUntil: "networkidle" });
  await page.waitForSelector(".fc-event", { timeout: 20_000 });
  await sleep(700);
  await page.locator(".fc-event").first().click();
  await page.waitForSelector('[role="dialog"]', { timeout: 8000 });
  await sleep(700);
});

// 26. nav-quick-add.png (optional) — the global nav "Add" capture dialog.
await capture("nav-quick-add.png", "/app (nav Add)", "The global nav 'Add someone' dialog (shared QuickAddForm) opened from the app nav.", async () => {
  await page.goto(`${BASE}/app/people`, { waitUntil: "networkidle" });
  await sleep(600);
  await page.getByRole("button", { name: "Add", exact: true }).first().click();
  await page.getByRole("dialog").filter({ hasText: /Add someone/i }).waitFor({ timeout: 8000 });
  await sleep(800);
});

// --- Shots for this PR: relationships / education / aliases / edge direction ---

// 27. people-change-relationship.png — the bulk "Change relationship" dialog
await capture(
  "people-change-relationship.png",
  "/app/people",
  "The bulk Change relationship dialog: a 'Which company' choice (their current company / a specific company) and a Relationship picker (studied at / worked at / interned at / …).",
  async () => {
    await page.goto(`${BASE}/app/people`, { waitUntil: "networkidle" });
    await sleep(1000);
    const boxes = page.getByRole("checkbox", { name: "Select row" });
    for (const i of [0, 1, 2]) await boxes.nth(i).click();
    await page.getByText(/\d+ selected/).first().waitFor({ timeout: 8000 });
    // The bulk-bar trigger (distinct from the dialog's confirm button of the same name).
    await page.getByRole("button", { name: "Change relationship" }).first().click();
    await page.waitForSelector('[role="dialog"]', { timeout: 8000 });
    await sleep(700);
  },
);

// 28. add-person-education.png — the contact form's Experience + Education sections
await capture(
  "add-person-education.png",
  "/app/people/new",
  "The contact form's Experience and Education sections — Education showing Institution, Degree / programme, Field of study, year fields, a 'Currently studying here' toggle, and a relationship-type selector.",
  async () => {
    await page.goto(`${BASE}/app/people/new`, { waitUntil: "networkidle" });
    await sleep(800);
    // Both groups start empty (just an add button); add one row each so the
    // fields — the point of the shot — render.
    await page.getByRole("button", { name: "Add role" }).click().catch(() => {});
    await page.getByRole("button", { name: "Add education" }).click().catch(() => {});
    await sleep(400);
    await page.getByRole("button", { name: "Add education" }).scrollIntoViewIfNeeded();
    // Nudge up so the Experience section above stays in frame too.
    await page.evaluate(() => window.scrollBy(0, -300));
    await sleep(400);
  },
);

// 29. companies-aliases.png — the global Company aliases page
await capture(
  "companies-aliases.png",
  "/app/companies/aliases",
  "The Company aliases page: alternate names each shown next to the company they resolve to, editable/removable in place.",
  async () => {
    // The seed records no aliases, so add one first via a company's edit dialog
    // (row Actions → Rename → 'Also known as'). Best-effort: if the DB already
    // has aliases this just adds one more.
    await page.goto(`${BASE}/app/companies`, { waitUntil: "networkidle" });
    await sleep(900);
    await page.getByRole("button", { name: /^Actions for/ }).first().click();
    await page.getByRole("menuitem", { name: "Rename" }).click();
    await page.getByText("Also known as").waitFor({ timeout: 8000 });
    await page.getByPlaceholder("Acme Corp").fill("Innovate Labs");
    // The alias "Add" button, distinct from the footer "Save changes".
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await sleep(800);
    await page.keyboard.press("Escape");
    await sleep(400);
    await page.goto(`${BASE}/app/companies/aliases`, { waitUntil: "networkidle" });
    await sleep(900);
    await page.evaluate(() => window.scrollTo(0, 0));
  },
);

// 30. graph-edge-direction.png — directional edges emphasised on hover.
// Deterministic via the ?e2e=1 hook, which exposes the sigma renderer on
// window.__dhagaGraph: we centre + zoom the camera on the focus node and compute
// its EXACT on-canvas pixel, then hover it so the reducer thickens its outgoing
// edges (bright-amber arrows) over the thinner/softer incoming ones. ?focus also
// opens the node panel (a Sheet that blurs the canvas); Escape dismisses it.
await capture(
  "graph-edge-direction.png",
  `/app/graph?focus=${CONTACT_ID}`,
  "A hovered focus node with the panel dismissed: outgoing edges thick amber arrows, incoming edges thinner/softer — edge direction at a glance.",
  async () => {
    await page.goto(`${BASE}/app/graph?focus=${CONTACT_ID}&e2e=1`, { waitUntil: "domcontentloaded" });
    await waitForGraph(page);
    await page.waitForSelector('[role="dialog"]', { timeout: 8000 }).catch(() => {});
    await page.keyboard.press("Escape");
    await page.waitForSelector('[role="dialog"]', { state: "detached", timeout: 8000 }).catch(() => {});
    await sleep(1400); // let the isolate's fit settle before reading the camera
    // Centre + zoom the camera on the focus node via the exposed renderer, then
    // return the node's exact viewport pixel. IMPORTANT: sigma's camera x/y are
    // in the FRAMED (normalized) space — use getNodeDisplayData for the target;
    // graphToViewport takes RAW graph coords. Zoom in from the isolate fit.
    const pt = await page.evaluate(async (id) => {
      const r = window.__dhagaGraph;
      if (!r || !r.getGraph().hasNode(id)) return null;
      const dd = r.getNodeDisplayData(id);
      if (!dd) return null;
      const cam = r.getCamera();
      const ratio = cam.getState().ratio * 0.55; // tighter than the fit → edges thicken
      await new Promise((resolve) => cam.animate({ x: dd.x, y: dd.y, ratio }, { duration: 500 }, resolve));
      const raw = r.getGraph().getNodeAttributes(id);
      const vp = r.graphToViewport({ x: raw.x, y: raw.y });
      return { x: vp.x, y: vp.y };
    }, CONTACT_ID);
    await sleep(500);
    if (pt) {
      const box = await page.locator("canvas").first().boundingBox();
      await page.mouse.move(box.x + pt.x, box.y + pt.y, { steps: 8 });
    }
    await sleep(900);
  },
);

await context.close();
await browser.close();

console.log("\nMANIFEST_JSON_START");
console.log(JSON.stringify(manifest, null, 2));
console.log("MANIFEST_JSON_END");

const failed = manifest.filter((m) => !m.ok);
if (failed.length) console.log(`\n${failed.length} FAILED: ${failed.map((f) => f.file).join(", ")}`);
else console.log("\nAll captures ok.");
