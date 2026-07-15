// Playwright verification for calendar integration + daily suggestions.
// Prereqs: a dev server with DHAGA_CALENDAR_DEMO=true and a
// BETTER_AUTH_SECRET/CALENDAR_TOKEN_SECRET set (so token encryption works), and
// a verified account for EMAIL below (email/password verification is required —
// on a fresh DB, verify the account once first).
// Run: node tests/scripts/verify-calendar-suggestions.mjs
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.DHAGA_TEST_BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.DHAGA_TEST_EMAIL ?? "caltest@dhaga.internal";
const PASSWORD = process.env.DHAGA_TEST_PASSWORD;
const NAME = "Calendar Tester";
if (!PASSWORD) {
  console.error("Set DHAGA_TEST_PASSWORD (the throwaway local test-account password) before running.");
  process.exit(1);
}
const SHOT_DIR = fileURLToPath(new URL("./.output", import.meta.url));
mkdirSync(SHOT_DIR, { recursive: true });

const results = [];
function check(name, ok) {
  results.push({ name, ok: Boolean(ok) });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}`);
}

async function ensureAuthed(page) {
  await page.goto(`${BASE}/signup`);
  await page.fill("#name", NAME);
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
  if (page.url().includes("/signup")) {
    await page.goto(`${BASE}/login`);
    await page.fill("#email", EMAIL);
    await page.fill("#password", PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/app/, { timeout: 15000 });
  }
  console.log("Authed at", page.url());
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("CONSOLE ERROR:", msg.text());
  });

  await ensureAuthed(page);

  // --- Settings: the calendar + suggestions panels render ---
  await page.goto(`${BASE}/app/settings`);
  await page.waitForSelector("text=Calendars");
  check("Settings shows Calendars panel", (await page.getByRole("heading", { name: "Calendars" }).count()) > 0);
  check("Settings shows Daily suggestions panel", (await page.getByRole("heading", { name: "Daily suggestions" }).count()) > 0);
  check("Connect Demo Calendar button present", (await page.getByText("Connect Demo Calendar").count()) > 0);
  await page.screenshot({ path: `${SHOT_DIR}/1-settings.png`, fullPage: true });

  // --- Connect the demo calendar (full OAuth loop, token encrypted + stored) ---
  await page.getByText("Connect Demo Calendar").click();
  await page.waitForURL(/calendar=/, { timeout: 20000 });
  await page.waitForTimeout(800);
  check("Redirected back with connected status", page.url().includes("calendar=connected"));
  check("Connected account email shown", (await page.getByText("demo@calendar.local").count()) > 0);
  await page.screenshot({ path: `${SHOT_DIR}/2-calendar-connected.png`, fullPage: true });

  // --- Tune the daily suggestion count and confirm it persists ---
  await page.fill('input[name="count"]', "3");
  await page.locator('form:has(input[name="count"]) button[type="submit"]').click();
  await page.waitForTimeout(1200);
  await page.reload();
  await page.waitForSelector('input[name="count"]');
  check("People/day persisted as 3", (await page.inputValue('input[name="count"]')) === "3");

  // --- Home renders the Today section without error (calendar-connected path) ---
  await page.goto(`${BASE}/app`);
  await page.waitForSelector('h2:has-text("Today")', { timeout: 15000 });
  check("Home shows Today section", (await page.locator('h2:has-text("Today")').count()) > 0);
  await page.screenshot({ path: `${SHOT_DIR}/3-home-today.png`, fullPage: true });

  // --- Disconnect removes the connection ---
  await page.goto(`${BASE}/app/settings`);
  await page.waitForSelector("text=demo@calendar.local");
  await page.locator('button[aria-label="Disconnect calendar"]').first().click();
  await page.waitForTimeout(1200);
  check("Disconnect removed the connection", (await page.getByText("demo@calendar.local").count()) === 0);
  await page.screenshot({ path: `${SHOT_DIR}/4-disconnected.png`, fullPage: true });

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log("FAILURES:", failed.map((f) => f.name).join(", "));
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
