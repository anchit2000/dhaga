import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { aiBudgetSettings } from "@/lib/db/schema";

/**
 * Raw access to `ai_budget_settings`, the instance-wide (never tenant-scoped)
 * operator config — see lib/db/ddl/ai-budget.ts for why it is not in `settings`.
 *
 * The whole table is a handful of rows, so every read pulls ALL of it in ONE
 * query and each parser (./config.ts, ./dollar-cap.ts) works from that map.
 * That is deliberate: the cap resolvers on the AI hot path need several of these
 * values at once, and fanning that into separate `getDb()` round-trips is the
 * exact pattern that has exhausted the small tenant pool before (docs/SCALING.md
 * and the search round-trip fix).
 */
export async function readAll(): Promise<Map<string, string>> {
  const db = await getDb();
  const rows = await db
    .select({ key: aiBudgetSettings.key, value: aiBudgetSettings.value })
    .from(aiBudgetSettings);
  return new Map(rows.map((row) => [row.key, row.value]));
}

export async function writeKey(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.execute(sql`
    insert into ai_budget_settings (key, value, updated_at)
    values (${key}, ${value}, now())
    on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at
  `);
}
