import { randomUUID } from "node:crypto";
import { ilike, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, companyAliases } from "@/lib/db/schema";

/**
 * Two concurrent callers naming the same company (two note extractions, or
 * a CSV import processing repeated employer names) must not race the
 * select-then-insert below into creating duplicate company rows. There's no
 * unique constraint on companies.name to fall back on with ON CONFLICT — DDL
 * runs idempotently on every boot (lib/db/ddl/core/), and adding one would
 * fail on any self-hosted install that already has duplicate names. Instead,
 * take a transaction-scoped Postgres advisory lock keyed on the
 * case-insensitive name: it serializes concurrent calls for the SAME name
 * (the second blocks until the first's transaction commits, then its own
 * SELECT sees the row the first just inserted) without touching the schema.
 */
export async function findOrCreateCompany(name: string): Promise<string> {
  const db = await getDb();
  const trimmed = name.trim();
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${trimmed.toLowerCase()}))`,
    );
    // TODO(search-index): route through getSearchIndex() (matchMode: "exact")
    const [existing] = await tx
      .select({ id: companies.id })
      .from(companies)
      .where(ilike(companies.name, trimmed))
      .limit(1);
    if (existing) return existing.id;
    // A name merged away survives as an alias — resolve it to the surviving
    // company instead of re-creating the duplicate. Query on `tx` (same
    // connection + advisory lock), never a second getDb() pool connection.
    const [aliased] = await tx
      .select({ companyId: companyAliases.companyId })
      .from(companyAliases)
      .where(ilike(companyAliases.alias, trimmed))
      .limit(1);
    if (aliased) return aliased.companyId;
    const id = randomUUID();
    await tx.insert(companies).values({ id, name: trimmed });
    return id;
  });
}
