import fs from "node:fs";
import path from "node:path";
import { test as setup, expect } from "@playwright/test";

/**
 * One login for the whole run. Playwright persists the session to storageState
 * and every spec reuses it (see the `chromium` project's dependency on `setup`).
 *
 * Login first. If it fails on a fresh local PGlite server the account doesn't
 * exist yet, so sign up instead — local (non-hosted) mode auto-verifies email,
 * so signup lands straight on /app. Against a deployed/hosted server the account
 * already exists (seed it beforehand), so the login path is taken.
 */
const authFile = path.join(__dirname, ".auth", "user.json");
const EMAIL =
  process.env.E2E_USE_AI_ACCOUNT === "1"
    ? (process.env.E2E_AI_EMAIL ?? "")
    : (process.env.E2E_EMAIL ?? "loadtest@dhaga.internal");
const PASSWORD =
  process.env.E2E_USE_AI_ACCOUNT === "1"
    ? (process.env.E2E_AI_PASSWORD ?? "")
    : (process.env.E2E_PASSWORD ?? "LoadTest-Dummy-2026!");

setup("authenticate", async ({ page }) => {
  expect(EMAIL, "E2E_EMAIL/E2E_PASSWORD must be set (see .env.e2e.local)").not.toBe("");

  await page.goto("/login");
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.getByRole("button", { name: /^Sign in$/ }).click();

  // Generous timeout: on a cold dev server the first hit to /api/auth/[...all]
  // can take ~20s to compile, which would otherwise look like a failed login.
  const loggedIn = await page
    .waitForURL("**/app**", { timeout: 45_000 })
    .then(() => true)
    .catch(() => false);

  if (!loggedIn) {
    // Fresh local server — create the account (local mode skips verification).
    // The signup submit stays disabled until password ≥ min length AND matches
    // the confirm field (#confirm-password), so fill both.
    await page.goto("/signup");
    await page.fill("#name", "E2E Test User");
    await page.fill("#email", EMAIL);
    await page.fill("#password", PASSWORD);
    await page.fill("#confirm-password", PASSWORD);
    await page.getByRole("button", { name: /Create account/i }).click();
    await page.waitForURL("**/app**", { timeout: 45_000 });
  }

  await expect(page).toHaveURL(/\/app/);

  // The first-run product tour (driver.js) auto-starts on Home and its overlay
  // intercepts clicks. Dismiss it once — ESC fires markOnboardingTourSeenAction,
  // which records "seen" server-side for this user, so it never auto-starts in
  // any later spec (regardless of storageState).
  await page.goto("/app");
  await page
    .locator(".driver-overlay")
    .waitFor({ state: "visible", timeout: 8_000 })
    .then(() => page.keyboard.press("Escape"))
    .catch(() => {});
  await page.waitForTimeout(1_500);

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
