import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";

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

mkdirSync("dist/icons", { recursive: true });
for (const file of ["manifest.json", "popup.html", "options.html"]) {
  copyFileSync(file, `dist/${file}`);
}
for (const size of [16, 32, 48, 128]) {
  copyFileSync(`icons/icon-${size}.png`, `dist/icons/icon-${size}.png`);
}
console.log("extension built into apps/extension/dist");

// --zip: package dist/ for the Chrome Web Store / Edge Add-ons.
// bsdtar (ships with Windows 10+, macOS, most Linux) writes the
// forward-slash entry names the store's Linux unpacker expects.
if (process.argv.includes("--zip")) {
  const { version } = JSON.parse(readFileSync("manifest.json", "utf8"));
  const zip = `../dhaga-extension-v${version}.zip`;
  const result = spawnSync(
    "tar",
    ["-a", "-cf", zip, "manifest.json", "popup.html", "popup.js", "options.html", "options.js", "icons"],
    { cwd: "dist", stdio: "inherit" },
  );
  if (result.status !== 0) throw new Error("zip packaging failed");
  console.log(`store zip: apps/extension/dhaga-extension-v${version}.zip`);
}
