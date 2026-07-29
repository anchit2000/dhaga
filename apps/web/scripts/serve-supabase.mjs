// Serve the PRODUCTION build on port 3010 against the Supabase DB configured in
// .env.vercel, with BETTER_AUTH_URL pointed at the local port. This is the
// stable server for doc screenshots (scripts/capture-docs-screenshots.mjs) and
// manual load-test E2E (the seeded `loadtest@dhaga.internal` user, see CLAUDE.md
// "Local / E2E testing").
//
// It uses `next start` (a single production server), NOT `next dev`: on
// low-memory machines Turbopack's dev-mode worker pool can fork-bomb (spawn
// hundreds of node workers) and crash the box. `next start` serves a prebuilt
// .next with a single stable process. Run a build first: `npm run build`.
//
// Why a launcher instead of `next start --env-file=.env.vercel`: passing
// --env-file to the `node` that runs next leaks the vars into NODE_OPTIONS.
// process.loadEnvFile() loads them into THIS process only; the spawned server
// inherits them via its environment.
//
// Usage (from apps/web):
//   npm run build                       # once, and after any app code change
//   node scripts/serve-supabase.mjs     # serves on :3010
//   PORT=3020 node scripts/serve-supabase.mjs
//
// Then, in another shell, capture screenshots against it:
//   BASE_URL=http://localhost:3010 node scripts/capture-docs-screenshots.mjs
//   # or a subset:
//   ONLY=graph-edge-direction.png BASE_URL=http://localhost:3010 node scripts/capture-docs-screenshots.mjs

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(webRoot);

if (!existsSync(resolve(webRoot, ".next/BUILD_ID"))) {
  console.error("[serve-supabase] No production build found (.next/BUILD_ID). Run `npm run build` first.");
  process.exit(1);
}

process.loadEnvFile(".env.vercel");
const port = process.env.PORT ?? "3010";
process.env.PORT = port;
process.env.BETTER_AUTH_URL = `http://localhost:${port}`;
delete process.env.NODE_OPTIONS; // keep --env-file leakage away from any child workers

console.log(
  `[serve-supabase] next start on :${port} (DATABASE_URL from .env.vercel, BETTER_AUTH_URL=${process.env.BETTER_AUTH_URL})`,
);

const child = spawn("npx", ["next", "start", "-p", port], { stdio: "inherit", shell: true });
child.on("exit", (code) => process.exit(code ?? 0));
