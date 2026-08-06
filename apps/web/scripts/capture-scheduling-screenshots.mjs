// Authenticated, local-only scheduling QA and optimized documentation captures.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const BASE = (process.env.BASE_URL ?? "http://localhost:3010").replace(/\/+$/, "");
const EMAIL = process.env.SCREENSHOT_EMAIL ?? "codex-scheduling@local.test";
const PASSWORD = process.env.SCREENSHOT_PASSWORD;
const CONTACT_ID = "docs-scheduling-primary-contact";
const APP_NOT_FOUND_PATH = "/app/this-page-is-still-being-woven";
const PUBLIC_NOT_FOUND_PATH = "/this-page-is-still-being-woven";
const OUT = resolve(process.env.SCREENSHOT_OUT ?? "public/docs/guide/scheduling");
if (!PASSWORD) throw new Error("Set SCREENSHOT_PASSWORD for the disposable local account.");

const results = [];
const browserErrors = [];

async function capture(page, file, options = {}) {
  const buffer = await page.screenshot({ fullPage: options.fullPage ?? true });
  await sharp(buffer).webp({ quality: 80, effort: 5 }).toFile(resolve(OUT, file));
  results.push({ file, url: page.url() });
}

function watchErrors(page) {
  page.on("pageerror", (error) => browserErrors.push(`pageerror ${page.url()} ${error.message}`));
  page.on("console", (message) => {
    const isExpectedNotFound =
      message.text().includes("404 (Not Found)") &&
      [APP_NOT_FOUND_PATH, PUBLIC_NOT_FOUND_PATH].includes(new URL(page.url()).pathname);
    if (message.type() === "error" && !isExpectedNotFound) {
      browserErrors.push(`console ${page.url()} ${message.text()}`);
    }
  });
}

async function signedInPage(colorScheme, viewport) {
  const context = await browser.newContext({ colorScheme, viewport, reducedMotion: "reduce" });
  await context.addInitScript((theme) => localStorage.setItem("theme", theme), colorScheme);
  const page = await context.newPage();
  watchErrors(page);
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/app**", { timeout: 60_000 });
  return { context, page };
}

await mkdir(OUT, { recursive: true });
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
const browser = await chromium.launch({
  ...(executablePath ? { executablePath } : process.platform === "darwin" ? { channel: "chrome" } : {}),
  args: ["--disable-dev-shm-usage"],
});

const light = await signedInPage("light", { width: 1440, height: 900 });
await light.page.goto(`${BASE}/app/tasks`, { waitUntil: "networkidle" });
await light.page.getByRole("heading", { name: "Tasks" }).waitFor();
await capture(light.page, "tasks-light-desktop.webp");

const companyTask = light.page.locator("li").filter({ hasText: "Prepare weekly team update" });
await companyTask.getByRole("button", { name: "Edit task" }).click();
await light.page.locator('select[name="recurrenceFrequency"]').waitFor();
await capture(light.page, "recurring-task-light-desktop.webp");

await light.page.goto(`${BASE}/app/confirmations`, { waitUntil: "networkidle" });
await light.page.getByRole("button", { name: "Keep Saturday" }).waitFor();
await capture(light.page, "weekend-confirmation-light-desktop.webp");

await light.page.goto(`${BASE}/app/calendar`, { waitUntil: "networkidle" });
await light.page.getByText("Reach out about the handloom collection").first().waitFor();
await capture(light.page, "calendar-light-desktop.webp");

const worker = await light.page.request.get(`${BASE}/maplibre/maplibre-gl-worker.mjs`);
if (worker.headers()["cross-origin-embedder-policy"] !== "credentialless") {
  throw new Error("MapLibre worker is missing COEP: credentialless");
}
await light.page.goto(`${BASE}/app/map`, { waitUntil: "networkidle" });
await light.page.locator("canvas").waitFor({ timeout: 30_000 });
await light.page.waitForTimeout(1_000);
if (await light.page.getByText(/Map unavailable|map couldn't load/i).count()) {
  throw new Error("Map rendered its unavailable state");
}
await capture(light.page, "map-light-desktop.webp");
await light.context.close();

const dark = await signedInPage("dark", { width: 1440, height: 900 });
await dark.page.route("**/app/calendar**", async (route) => {
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_500));
  await route.continue();
});
await dark.page.goto(`${BASE}/app/tasks`, { waitUntil: "domcontentloaded" });
const calendarLink = dark.page.getByRole("link", { name: "Calendar" });
await calendarLink.waitFor();
await calendarLink.click();
await dark.page.locator('[aria-label="Loading calendar"]').waitFor({ timeout: 3_000 });
await capture(dark.page, "calendar-loading-dark-desktop.webp", { fullPage: false });
await dark.page.waitForURL("**/app/calendar");
await dark.context.close();

const mobile = await signedInPage("dark", { width: 375, height: 812 });
await mobile.page.goto(`${BASE}/app/people/${CONTACT_ID}`, { waitUntil: "networkidle" });
await mobile.page.getByLabel("Day of week").selectOption("1");
await mobile.page.getByText("This change has not been saved yet.").waitFor();
await mobile.page.getByText("This change has not been saved yet.").scrollIntoViewIfNeeded();
await capture(mobile.page, "keep-in-touch-warning-dark-mobile.webp", { fullPage: false });
await mobile.page.goto(`${BASE}${APP_NOT_FOUND_PATH}`, { waitUntil: "networkidle" });
await mobile.page.getByText("404 · Loose thread").waitFor();
await capture(mobile.page, "app-404-dark-mobile.webp");
await mobile.context.close();

const publicContext = await browser.newContext({
  colorScheme: "light",
  viewport: { width: 375, height: 812 },
  reducedMotion: "reduce",
});
await publicContext.addInitScript(() => localStorage.setItem("theme", "light"));
const publicPage = await publicContext.newPage();
watchErrors(publicPage);
await publicPage.goto(`${BASE}${PUBLIC_NOT_FOUND_PATH}`, { waitUntil: "networkidle" });
await publicPage.getByText("404 · Loose thread").waitFor();
await capture(publicPage, "public-404-light-mobile.webp");
await publicContext.close();
await browser.close();

console.log(JSON.stringify({ results, browserErrors }, null, 2));
if (browserErrors.length > 0) process.exitCode = 1;
