import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { aiCeilingContextFor } from "../spend";
import type { SQL } from "drizzle-orm";

/**
 * WHY this test exists: the admin AI-credits screen 500'd in production with
 * `malformed array literal` (22P02). A bare `${userIds}` in a drizzle `sql`
 * template is expanded into a parenthesised value list, so `any(${userIds})`
 * compiled to `any(($2))` and Postgres tried to read a single user id as an
 * array literal. Nothing about that is visible in TypeScript — the function
 * typechecks, and it only fails once a real driver binds the parameter.
 *
 * So the assertions below are on the COMPILED SQL and its bound parameters:
 * the id list must reach the driver as ONE array-typed parameter, never as N
 * scalars and never wrapped in the parens that caused the outage. It follows
 * the `listFeedbackPage` precedent — compiling the real `sql` needs no driver,
 * so this runs in the plain unit suite.
 */

const dialect = new PgDialect();
let queries: { sql: string; params: unknown[] }[] = [];
let responses: Record<string, unknown>[][] = [];
const released = { count: 0 };

vi.mock("../../db/admin-db", () => ({
  openAdminConnection: async () => ({
    db: {
      execute: async (query: SQL) => {
        queries.push(dialect.sqlToQuery(query));
        return { rows: responses.shift() ?? [] };
      },
    },
    release: async () => {
      released.count += 1;
    },
  }),
}));

beforeEach(() => {
  queries = [];
  responses = [];
  released.count = 0;
});

describe("aiCeilingContextFor", () => {
  it("binds the id list as a single array parameter, not a value list", async () => {
    responses = [[]];
    await aiCeilingContextFor(["user-a", "user-b"], "ai_monthly_dollar_cap_override");

    const [query] = queries;
    // The regression: `any(($2, $3))` — parenthesised scalars — is what threw
    // 22P02. One placeholder, cast to an array, is the only shape that works.
    expect(query.sql.replace(/\s+/g, " ")).toContain("any($2::text[])");
    expect(query.sql).not.toContain("any((");
    expect(query.params).toEqual(["ai_monthly_dollar_cap_override", ["user-a", "user-b"]]);
  });

  it("binds a single id as a one-element array, the exact case that 500'd", async () => {
    responses = [[]];
    await aiCeilingContextFor(["TkwXXcb7Odv5JGrDSOTkcFQlJPx2K93N"], "ai_monthly_dollar_cap_override");

    // With one id the broken form was `any(($2))` with a bare string param —
    // syntactically valid, so it reached Postgres and blew up there.
    expect(queries[0].params[1]).toEqual(["TkwXXcb7Odv5JGrDSOTkcFQlJPx2K93N"]);
  });

  it("never opens a connection for an empty id list", async () => {
    expect(await aiCeilingContextFor([], "ai_monthly_dollar_cap_override")).toEqual([]);
    expect(queries).toHaveLength(0);
    expect(released.count).toBe(0);
  });

  it("treats a non-active subscription as free, so a lapsed payer is not billed as Pro", async () => {
    responses = [[{ id: "u1", email: "a@b.com", plan: "pro", status: "canceled", dollar_override: null }]];
    const [row] = await aiCeilingContextFor(["u1"], "k");
    expect(row.plan).toBe("free");
    expect(row.dollarOverrideUsd).toBeNull();
  });

  it("keeps a zero override, which means 'no AI spend', distinct from 'no override'", async () => {
    responses = [
      [
        { id: "u1", email: "a@b.com", plan: "pro", status: "active", dollar_override: "0" },
        { id: "u2", email: "c@d.com", plan: "pro", status: "active", dollar_override: "not-a-number" },
      ],
    ];
    const rows = await aiCeilingContextFor(["u1", "u2"], "k");
    // 0 is a real ceiling; falling back to null here would silently grant the
    // instance default to a user an admin had deliberately cut off.
    expect(rows[0].dollarOverrideUsd).toBe(0);
    expect(rows[1].dollarOverrideUsd).toBeNull();
  });

  it("releases the admin connection", async () => {
    responses = [[]];
    await aiCeilingContextFor(["u1"], "k");
    expect(released.count).toBe(1);
  });
});
