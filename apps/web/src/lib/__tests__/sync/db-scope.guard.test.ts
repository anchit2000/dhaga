import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Rule 9 tripwire, sibling of action-db-scope.guard.test.ts.
 *
 * A sync run reconciles up to SYNC_MAX_CONTACTS contacts in one request. If any
 * step of it resolves its own connection — a `getDb()` inside the loop, or a
 * `Promise.all` fanning the batch out — it opens a fresh checkout per contact
 * and exhausts the max-3 tenant pool, which 500s the request. That failure has
 * shipped here repeatedly (PRs #60, #83, #92, #96), so the invariant is
 * asserted on the source rather than trusted to review: repo/sync takes the db
 * as an argument everywhere, and only the entry points in index.ts open one.
 *
 * A runtime assertion cannot replace this: tests run on PGlite, which has a
 * single connection and so cannot exhaust anything.
 */
const SYNC_DIR = fileURLToPath(new URL("../../repo/sync", import.meta.url));

function sourceFiles(dir: string): { name: string; source: string }[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => ({ name: entry.name, source: readFileSync(join(dir, entry.name), "utf8") }));
}

function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

describe("contact sync runs the whole batch on one scoped connection", () => {
  const files = sourceFiles(SYNC_DIR);

  it("has files to check", () => {
    expect(files.length).toBeGreaterThan(3);
  });

  it("resolves a connection only in the entry points", () => {
    const offenders = files
      .filter((file) => file.name !== "index.ts")
      .filter((file) => /\bgetDb\s*\(/.test(withoutComments(file.source)))
      .map((file) => file.name);
    expect(
      offenders,
      `repo/sync/${offenders.join(", ")} calls getDb() — take the db as an argument instead`,
    ).toEqual([]);
  });

  it("opens exactly one connection per entry point, inside withUserDb", () => {
    const index = withoutComments(
      files.find((file) => file.name === "index.ts")?.source ?? "",
    );
    expect(index.match(/\bgetDb\s*\(/g) ?? []).toHaveLength(2); // push + ack
    expect(index.match(/\bwithUserDb\s*\(/g) ?? []).toHaveLength(2);
  });

  it("never fans the batch out concurrently", () => {
    const offenders = files
      .filter((file) => /Promise\.(all|allSettled|race)\s*\(/.test(withoutComments(file.source)))
      .map((file) => file.name);
    expect(
      offenders,
      `repo/sync/${offenders.join(", ")} fans out concurrently — reconcile must stay sequential`,
    ).toEqual([]);
  });
});
