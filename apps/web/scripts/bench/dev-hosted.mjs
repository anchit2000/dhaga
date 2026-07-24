// Launch `next dev` against the hosted Supabase DB (apps/web/.env.vercel) so the
// search benchmarks below can drive real, region-away data. `next dev` only
// auto-loads .env.local (local PGlite), and passing --env-file on the CLI leaks
// that flag into NODE_OPTIONS for Next's worker processes (which reject it), so
// this loads the env at runtime instead and overrides BETTER_AUTH_URL to the
// local port. Run from apps/web:  node scripts/bench/dev-hosted.mjs
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const PORT = process.env.PORT ?? "3010";
// apps/web/.env.vercel — three levels up from apps/web/scripts/bench/.
process.loadEnvFile(fileURLToPath(new URL("../../.env.vercel", import.meta.url)));
process.env.BETTER_AUTH_URL = `http://localhost:${PORT}`;

// next is hoisted to the monorepo root node_modules (workspaces).
const nextBin = fileURLToPath(new URL("../../../../node_modules/next/dist/bin/next", import.meta.url));
const child = spawn(process.execPath, [nextBin, "dev", "--port", PORT], {
  stdio: "inherit",
  env: process.env,
});
child.on("exit", (code) => process.exit(code ?? 0));
