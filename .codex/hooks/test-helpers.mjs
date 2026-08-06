import { readFileSync } from "node:fs";

export const ROOT = "/workspace/dhaga";

export function fixture(name) {
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));
}

export function fakeOps(overrides = {}) {
  const files = new Map(Object.entries(overrides.files ?? {}));
  return {
    exists: (path) => files.has(path),
    read: (path) => files.get(path) ?? "",
    root: () => ROOT,
    git: (_root, args) => {
      const key = args.join(" ");
      if (key === "rev-parse --abbrev-ref HEAD") return overrides.branch ?? "codex/fixture";
      if (key === "diff --cached --name-only --diff-filter=ACMRD") return overrides.staged ?? "";
      if (key.startsWith("diff --name-only --")) return overrides.stale ?? "";
      if (key === "status --porcelain") return overrides.dirty ?? "";
      if (key === "rev-list --count @{u}..HEAD") {
        if (overrides.noUpstream) throw new Error("no upstream");
        return String(overrides.ahead ?? 0);
      }
      return "";
    },
    run: () => overrides.run ?? { status: 0, output: "" },
  };
}
