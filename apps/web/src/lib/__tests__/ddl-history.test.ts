import { describe, expect, it, vi } from "vitest";
import { ddlAlreadyApplied, ddlFingerprint, recordDdlApplied } from "@/lib/db/ddl-history";
import type { Pool } from "pg";

function stubPool(queryImpl: (sql: string, params?: unknown[]) => unknown): Pool {
  return { query: vi.fn(queryImpl) } as unknown as Pool;
}

/**
 * The skip only pays off if the fingerprint actually reflects the schema
 * text — a hash that ignored edits would silently pin a stale schema on
 * every future cold start.
 */
describe("ddlFingerprint", () => {
  it("is stable for identical text and differs when the DDL text changes", () => {
    const ddl = "CREATE TABLE foo (id text)";
    expect(ddlFingerprint(ddl)).toBe(ddlFingerprint(ddl));
    expect(ddlFingerprint(ddl)).not.toBe(ddlFingerprint(`${ddl};`));
  });
});

/**
 * ddlAlreadyApplied is the cold-start gate: a wrong answer in either
 * direction is bad — a false "true" would strand a fresh database with no
 * schema, and a false "false" would burn the multi-second DDL round trip
 * this feature exists to skip.
 */
describe("ddlAlreadyApplied", () => {
  it("returns false when the query throws (fresh database without ddl_history)", async () => {
    const pool = stubPool(() => {
      throw new Error('relation "ddl_history" does not exist');
    });
    expect(await ddlAlreadyApplied(pool, "abc")).toBe(false);
  });

  it("returns false when no row matches, true when a row matches", async () => {
    const noMatch = stubPool(() => ({ rowCount: 0 }));
    expect(await ddlAlreadyApplied(noMatch, "abc")).toBe(false);

    const match = stubPool(() => ({ rowCount: 1 }));
    expect(await ddlAlreadyApplied(match, "abc")).toBe(true);
  });
});

/**
 * recordDdlApplied must work against a database that has never seen
 * ddl_history before, and must never interpolate the fingerprint into SQL
 * text (bind parameters only).
 */
describe("recordDdlApplied", () => {
  it("creates the history table before inserting, and binds the fingerprint as a parameter", async () => {
    const calls: unknown[][] = [];
    const pool = stubPool((sql: string, params?: unknown[]) => {
      calls.push([sql, params]);
      return {};
    });

    await recordDdlApplied(pool, "some-fingerprint");

    expect(calls).toHaveLength(2);
    expect(calls[0][0]).toContain("CREATE TABLE IF NOT EXISTS ddl_history");
    expect(calls[1][0]).toContain("INSERT INTO ddl_history");
    expect(calls[1][1]).toEqual(["some-fingerprint"]);
  });
});
