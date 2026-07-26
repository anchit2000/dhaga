import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

// Local-only creds/target live in .env.e2e.local (gitignored). Load it first so
// its values win, then fall back to .env.local for any shared dev values.
dotenv.config({ path: path.resolve(__dirname, ".env.e2e.local") });
dotenv.config({ path: path.resolve(__dirname, ".env.local") });

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const isLocal =
  BASE_URL.startsWith("http://localhost") || BASE_URL.startsWith("http://127.0.0.1");

// This suite is meant to be WATCHED — headed by default. Headless only in CI, or
// when E2E_HEADLESS=1 (used for unattended/background verification runs).
const headless = !!process.env.CI || process.env.E2E_HEADLESS === "1";

export default defineConfig({
  testDir: "./e2e",
  // Flows share one account and build on each other's data; keep them serial and
  // deterministic rather than racing parallel workers against one graph.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  outputDir: "./test-results",
  use: {
    baseURL: BASE_URL,
    headless,
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // The /app graph uses WebGPU/WebGL; a headless Chromium GPU-process crash can
    // take down the home page (a known artifact, not a real bug). Forcing software
    // GL makes headless behave like headed here.
    launchOptions: {
      args: [
        "--disable-gpu",
        "--disable-features=WebGPU",
        "--disable-webgl",
        "--use-gl=swiftshader",
      ],
    },
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        headless,
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],
  // Auto-start a local dev server only when targeting localhost. Against a
  // deployed URL the server is already up, so skip it.
  webServer: isLocal
    ? {
        command: "npm run dev",
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 180_000,
        stdout: "ignore",
        stderr: "pipe",
      }
    : undefined,
});
