// Playwright verification script for the "View in graph" deep link
// (contact profile -> /app/graph?focus=<id>, pan/expand/highlight).
// Prereqs: a dev server running at BASE (npm run dev --workspace web), plain
// local mode (no DATABASE_URL, so email verification's auto-bypassed for
// this account isn't relevant the same way as hosted mode).
// Run: node tests/scripts/verify-graph-focus.mjs
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.DHAGA_TEST_BASE_URL ?? "http://localhost:3000";
const EMAIL = "loadtest@dhaga.internal";
const PASSWORD = "LoadTest-Dummy-2026!";
const NAME = "Dummy Load Test";
const SHOT_DIR = fileURLToPath(new URL("./.output", import.meta.url));
mkdirSync(SHOT_DIR, { recursive: true });

async function ensureAuthed(page) {
  await page.goto(`${BASE}/signup`);
  await page.fill("#name", NAME);
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);

  if (page.url().includes("/signup")) {
    console.log("Signup didn't move on (likely account already exists) — trying login instead.");
    await page.goto(`${BASE}/login`);
    await page.fill("#email", EMAIL);
    await page.fill("#password", PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/app/, { timeout: 10000 });
  }
  console.log("Authed. Current URL:", page.url());
}

async function addPerson(page, name, company) {
  await page.goto(`${BASE}/app/people/new`);
  await page.fill("#name", name);
  if (company) await page.fill("#company", company);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/app\/people\/(?!new$)[^/]+$/, { timeout: 10000 });
  const url = page.url();
  const id = url.split("/").pop();
  console.log(`Created "${name}" (company=${company ?? "none"}) -> id=${id}`);
  return id;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("CONSOLE ERROR:", msg.text());
  });

  await ensureAuthed(page);

  const companyId = await addPerson(page, "Playwright Test Person", "Acme Verification Co");
  const noCompanyId = await addPerson(page, "Playwright No-Company Person", null);

  // --- Case 1: contact with a company ---
  await page.goto(`${BASE}/app/people/${companyId}`);
  await page.waitForSelector("text=View in graph");
  await page.screenshot({ path: `${SHOT_DIR}/1-profile-page.png`, fullPage: true });

  await page.click("text=View in graph");
  await page.waitForURL(/\/app\/graph\?focus=/, { timeout: 10000 });
  await page.waitForTimeout(2500); // camera pans + cluster fetch + second pan
  await page.screenshot({ path: `${SHOT_DIR}/2-graph-focused.png` });

  // Clear highlight by clicking empty canvas (bottom-left corner, away from
  // both the nav bar and the rendered nodes/cluster).
  await page.mouse.click(150, 800);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOT_DIR}/3-graph-cleared.png` });

  // --- Case 2: contact with no company (Unassigned cluster) ---
  await page.goto(`${BASE}/app/graph?focus=${noCompanyId}`);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${SHOT_DIR}/4-graph-unassigned-focus.png` });

  // --- Deleted/bogus id ---
  await page.goto(`${BASE}/app/graph?focus=totally-bogus-id`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOT_DIR}/5-graph-missing-toast.png` });

  // --- Mobile width check on the profile page button ---
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(`${BASE}/app/people/${companyId}`);
  await page.waitForSelector("text=View in graph");
  await page.screenshot({ path: `${SHOT_DIR}/6-profile-375px.png`, fullPage: true });

  await browser.close();
  console.log("Done. Screenshots written to", SHOT_DIR);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
