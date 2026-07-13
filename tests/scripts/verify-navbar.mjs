// Playwright verification script for the app-nav overhaul (glass surface,
// centered search, icon nav pills, More/Profile split, sticky-on-scroll).
// Prereqs: a dev server running at BASE (npm run dev --workspace web), plain
// local mode (no DATABASE_URL, so email verification is auto-bypassed).
// Run: node tests/scripts/verify-navbar.mjs
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

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.log("CONSOLE ERROR:", msg.text());
  });

  await ensureAuthed(page);

  // --- Desktop: nav at top ---
  await page.goto(`${BASE}/app`);
  await page.waitForSelector("text=dhaga");
  await page.screenshot({ path: `${SHOT_DIR}/nav-desktop-top.png` });

  // --- Desktop: More menu open ---
  await page.getByRole("button", { name: "More" }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOT_DIR}/nav-desktop-more-open.png` });
  await page.keyboard.press("Escape");

  // --- Desktop: Profile menu open ---
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOT_DIR}/nav-desktop-profile-open.png` });
  await page.keyboard.press("Escape");

  // --- Desktop: sticky on scroll (scroll the people list, a long page) ---
  await page.goto(`${BASE}/app/people`);
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOT_DIR}/nav-desktop-scrolled.png` });

  // --- Mobile (375px): nav at top ---
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(`${BASE}/app`);
  await page.waitForSelector("text=dhaga");
  await page.screenshot({ path: `${SHOT_DIR}/nav-mobile-top.png` });

  // --- Mobile: scrolled (sticky check) ---
  await page.goto(`${BASE}/app/people`);
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOT_DIR}/nav-mobile-scrolled.png` });

  await browser.close();
  console.log("Done. Screenshots written to", SHOT_DIR);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
