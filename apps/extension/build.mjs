import { build } from "esbuild";
import { copyFileSync, mkdirSync } from "node:fs";

// Bundles the TS entry points and copies static assets into dist/ —
// load dist/ as an unpacked extension in Chrome/Edge.
mkdirSync("dist", { recursive: true });

await build({
  entryPoints: ["src/popup.ts", "src/options.ts"],
  bundle: true,
  format: "iife",
  target: "chrome120",
  outdir: "dist",
});

for (const file of ["manifest.json", "popup.html", "options.html"]) {
  copyFileSync(file, `dist/${file}`);
}
console.log("extension built into apps/extension/dist");
