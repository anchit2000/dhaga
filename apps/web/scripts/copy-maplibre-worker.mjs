// Copies MapLibre's worker bundle out of node_modules and into
// `public/maplibre/`, so `MAPLIBRE_WORKER_URL` (utils/constants/map.ts) has
// something to point at. Chained into `dev` and `build` — deliberately NOT
// `postinstall`, because the Dockerfile installs from the workspace manifests
// alone, before `COPY . .`, so a postinstall reaching into `scripts/` would
// break the image build. The output is gitignored and regenerated, never
// edited.
//
// WHY THIS EXISTS — maplibre-gl v6 loads its worker from a URL it computes at
// RUNTIME (`new URL('./maplibre-gl-worker.mjs', import.meta.url)`, see
// src/util/web_worker.ts). No bundler can see through that, so once Next
// inlines the library into an app chunk the URL resolves to
// `/_next/static/chunks/maplibre-gl-worker.mjs` — a file that was never
// emitted. The dev server and Vercel both answer a miss with the HTML shell,
// the browser rejects a module worker served as `text/html`, and the map hangs
// on its loading veil forever with no error surfaced to the user. v5 inlined
// the worker as a Blob and had no such step; v6 traded that for a smaller main
// bundle and a `config.WORKER_URL` knob, which is what we set.
//
// BOTH files are required: the worker is an ES module that statically imports
// `./maplibre-gl-shared.mjs` as a sibling, so shipping the worker alone leaves
// it 404-ing on the exact same failure one level down.

import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const WORKER_FILES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

const require = createRequire(import.meta.url);
// Resolve through the package rather than guessing a node_modules path: npm
// may hoist maplibre-gl to the workspace root or keep it under apps/web.
const distDir = join(dirname(require.resolve("maplibre-gl/package.json")), "dist");
const outDir = join(process.cwd(), "public", "maplibre");

mkdirSync(outDir, { recursive: true });
for (const file of WORKER_FILES) {
  copyFileSync(join(distDir, file), join(outDir, file));
}

console.log(`copy-maplibre-worker: ${WORKER_FILES.join(", ")} -> public/maplibre/`);
