import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies } from "@/lib/db/schema";
import { findOrCreateCompany } from "@/lib/repo/contacts";

/**
 * findOrCreateCompany is a select-then-insert with no unique constraint on
 * companies.name to backstop it (a migration adding one would fail on any
 * self-hosted install that already has duplicate names — see mutations.ts).
 * Two concurrent calls for the SAME company name are a realistic race: two
 * note extractions naming the same employer, or a CSV import processing
 * repeated employer names concurrently. Before the advisory-lock fix, both
 * calls would see "no existing row" and both insert, producing two company
 * rows for what should be one. This test fires the calls concurrently and
 * asserts exactly one row survives with both calls resolving to the same id
 * — it would have failed (2 rows, 2 distinct ids) against the pre-fix
 * select-then-insert with no locking.
 */
describe("findOrCreateCompany concurrency", () => {
  it("two concurrent calls for the same name create exactly one company row", async () => {
    const db = await getDb();
    const name = "Race Condition Freight Co";

    const [idA, idB] = await Promise.all([
      findOrCreateCompany(name),
      findOrCreateCompany(name),
    ]);

    expect(idA).toBe(idB);

    const rows = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.name, name));
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(idA);
  });

  it("still returns the existing id when the company was created before the call", async () => {
    const db = await getDb();
    const name = "Pre-Existing Ventures";

    const firstId = await findOrCreateCompany(name);
    const secondId = await findOrCreateCompany(`  ${name}  `); // trimmed + re-looked-up

    expect(secondId).toBe(firstId);

    const rows = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.name, name));
    expect(rows).toHaveLength(1);
  });
});
