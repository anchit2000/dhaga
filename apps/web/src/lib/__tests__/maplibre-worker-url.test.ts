import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MAPLIBRE_WORKER_URL } from "@/utils/constants/map";

/**
 * Guards the seam between `scripts/copy-maplibre-worker.mjs` (which writes the
 * worker into `public/`) and `MAPLIBRE_WORKER_URL` (which is what `Map.tsx`
 * hands MapLibre). Nothing in the type system connects the two, and when they
 * disagree the map does not error — it hangs on its loading veil forever,
 * because a worker that fails to load simply means `load` never fires. That is
 * how this shipped to production once already. A drifted path, a renamed
 * directory, or a dropped build step has to fail here instead.
 */
describe("MapLibre worker asset", () => {
  const webRoot = process.cwd();

  // Idempotent and fast; running it here also means the assertions hold on a
  // clean checkout, where `public/maplibre/` does not exist until a build.
  execFileSync(process.execPath, [join("scripts", "copy-maplibre-worker.mjs")], {
    cwd: webRoot,
    stdio: "ignore",
  });

  it("serves the worker at exactly the URL the app asks for", () => {
    const served = join(webRoot, "public", MAPLIBRE_WORKER_URL);
    expect(existsSync(served)).toBe(true);
  });

  it("ships the sibling chunk the worker imports", () => {
    // The worker is an ES module importing `./maplibre-gl-shared.mjs` relative
    // to itself. Copying the worker alone leaves it 404-ing one level down —
    // the same silent hang, one step later.
    const served = join(webRoot, "public", MAPLIBRE_WORKER_URL);
    const source = readFileSync(served, "utf8");
    const siblings = [...source.matchAll(/from\s*"\.\/([\w.-]+\.mjs)"/g)].map((m) => m[1]);

    expect(siblings.length).toBeGreaterThan(0);
    for (const sibling of siblings) {
      expect(existsSync(join(served, "..", sibling))).toBe(true);
    }
  });
});
