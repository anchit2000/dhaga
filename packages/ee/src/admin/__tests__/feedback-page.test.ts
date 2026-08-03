import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listFeedbackPage } from "../feedback";
import type { SQL } from "drizzle-orm";

/**
 * WHY this test exists: an admin list over other people's prose grows without
 * bound, so the paging has to be real. The two ways it goes wrong are silent —
 * an off-by-one in the offset repeats or skips a whole page of reports, and a
 * page-2 request that quietly loads the table pages in the browser instead.
 * Both look fine on a table with four rows.
 *
 * It compiles the REAL drizzle `sql` the function builds (no driver needed, so
 * this runs in the plain unit suite) and asserts on the emitted query and its
 * bound parameters, then feeds canned rows back to pin the snake_case →
 * camelCase mapping and the string → Date timestamp coercion that raw
 * `db.execute()` skips.
 */

const dialect = new PgDialect();
let queries: { sql: string; params: unknown[] }[] = [];
let responses: (Record<string, unknown>[] | Error)[] = [];
const released = { count: 0 };

vi.mock("../../db/admin-db", () => ({
  openAdminConnection: async () => ({
    db: {
      execute: async (query: SQL) => {
        queries.push(dialect.sqlToQuery(query));
        const next = responses.shift() ?? [];
        if (next instanceof Error) throw next;
        return { rows: next };
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

describe("listFeedbackPage", () => {
  it("asks the database for one page, at the right offset", async () => {
    responses = [[], [{ total: 42 }]];
    await listFeedbackPage({ page: 3, pageSize: 10 });

    const [page] = queries;
    // Page 3 of 10 starts at row 21 — offset 20, not 30 and not 21.
    expect(page.params).toContain(10);
    expect(page.params).toContain(20);
    expect(page.sql).toContain("limit");
    expect(page.sql).toContain("offset");
    // Newest first, or "page 1" is an arbitrary slice that reshuffles between
    // requests as new reports arrive.
    expect(page.sql.replace(/\s+/g, " ")).toContain("order by f.created_at desc");
  });

  it("starts page 1 at offset 0", async () => {
    responses = [[], [{ total: 1 }]];
    await listFeedbackPage({ page: 1, pageSize: 25 });
    expect(queries[0].params).toContain(0);
  });

  it("counts the whole table, not the page, so the last page is reachable", async () => {
    responses = [[], [{ total: 137 }]];
    const { total } = await listFeedbackPage({ page: 1, pageSize: 10 });
    expect(total).toBe(137);
    expect(queries[1].sql).toContain("count(*)");
    expect(queries[1].sql).not.toContain("limit");
  });

  it("maps a raw row, coercing the string timestamp the driver hands back", async () => {
    responses = [
      [
        {
          id: "f1",
          message: "the graph is slow",
          route: "/app/graph",
          viewport: "375x812",
          user_agent: "Mozilla/5.0",
          locale: "en-AU",
          timezone: "Australia/Sydney",
          app_version: "4f2a1c9",
          created_at: "2026-08-01T09:30:00.000Z",
          user_id: "u1",
          user_name: "Sam",
          user_email: "sam@example.test",
        },
      ],
      [{ total: 1 }],
    ];
    const { rows } = await listFeedbackPage({ page: 1, pageSize: 10 });
    expect(rows[0].userAgent).toBe("Mozilla/5.0");
    expect(rows[0].appVersion).toBe("4f2a1c9");
    expect(rows[0].userEmail).toBe("sam@example.test");
    expect(rows[0].createdAt).toBeInstanceOf(Date);
    expect(rows[0].createdAt.toISOString()).toBe("2026-08-01T09:30:00.000Z");
  });

  it("releases the admin connection even when the query throws", async () => {
    // The EE pool caps out fast; a leaked connection per failed admin render is
    // what takes the panel down, so the `finally` is load-bearing.
    responses = [new Error("relation \"feedback\" does not exist")];
    await expect(listFeedbackPage({ page: 1, pageSize: 10 })).rejects.toThrow();
    expect(released.count).toBe(1);
  });
});
