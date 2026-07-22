// Capture screenshots of a running dev server for quick visual review.
//
// One-time setup (downloads the Chromium binary):
//   npm run screenshot:install
//
// Usage (requires a dev server already running — `npm run dev`):
//   npm run screenshot                       # http://localhost:3000/  -> home-*.png
//   npm run screenshot -- /app               # a specific route
//   npm run screenshot -- / --out ./shots    # custom output dir
//   BASE_URL=http://localhost:3010 npm run screenshot -- /
//
// Renders with reduced-motion + dark theme so the landing page's scroll/on-load
// reveal animations settle to their final state. Writes a crisp viewport shot
// (2x) and a full-page shot (1x) into `.screenshots/` (gitignored) by default.

import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const argValue = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : undefined;
};

const path = args.find((a) => !a.startsWith("--")) ?? "/";
const base = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const url = base + (path.startsWith("/") ? path : `/${path}`);
const slug = path.replace(/^\/+|\/+$/g, "").replace(/\/+/g, "-") || "home";
const outDir = resolve(argValue("--out") ?? process.env.SCREENSHOT_OUT ?? ".screenshots");

// Runs in the page: scroll top-to-bottom to trigger any lazy/deferred sections,
// then return to the top so the full-page capture is complete.
function scrollThrough() {
  return new Promise((done) => {
    let y = 0;
    const step = () => {
      window.scrollTo(0, y);
      y += 600;
      if (y < document.body.scrollHeight) setTimeout(step, 60);
      else {
        window.scrollTo(0, 0);
        setTimeout(done, 400);
      }
    };
    step();
  });
}

await mkdir(outDir, { recursive: true });

let browser;
try {
  browser = await chromium.launch();
} catch (err) {
  console.error(
    `Could not launch Chromium — run \`npm run screenshot:install\` once to download it.\n${err.message}`,
  );
  process.exit(1);
}

async function shot(label, { deviceScaleFactor, fullPage }) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1024 },
    deviceScaleFactor,
    reducedMotion: "reduce",
    colorScheme: "dark",
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "load", timeout: 120_000 });
  await page.waitForTimeout(2500); // fonts + canvas settle
  if (fullPage) {
    await page.evaluate(scrollThrough);
    await page.waitForTimeout(1000);
  }
  const file = resolve(outDir, `${slug}-${label}.png`);
  await page.screenshot({ path: file, fullPage });
  await ctx.close();
  console.log(`✓ ${file}`);
}

try {
  await shot("viewport", { deviceScaleFactor: 2, fullPage: false });
  await shot("full", { deviceScaleFactor: 1, fullPage: true });
} catch (err) {
  console.error(
    `Failed to capture ${url} — is the dev server running (\`npm run dev\`)?\n${err.message}`,
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
