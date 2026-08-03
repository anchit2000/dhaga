import { eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { settings } from "@/lib/db/schema";

/**
 * Raw access to the key/value settings table. Split out of ./index.ts (150-line
 * rule); the typed accessors that parse these strings live there.
 */

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);
  return row?.value ?? null;
}

/**
 * Several keys in ONE round-trip — the settings equivalent of the search
 * round-trip collapse (lib/repo/search/keyword/combined).
 *
 * Why it exists: a render that needs N preferences used to cost N identical
 * `select value from settings where key = $1` statements, and on an RSC page
 * read those all run on the ONE request-pinned tenant connection
 * (lib/db/request-scope.ts) — so they are strictly SERIAL round-trips, and every
 * one of them extends how long that request holds a slot in the max-3 tenant
 * pool. Home alone issued five (measured). Fetching them together makes the
 * whole set cost one.
 *
 * Missing keys are simply absent from the map, exactly as getSetting returns
 * null for them — callers keep applying their own defaults.
 */
export async function getSettings(keys: readonly string[]): Promise<Map<string, string>> {
  if (keys.length === 0) return new Map();
  const db = await getDb();
  const rows = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(inArray(settings.key, [...keys]));
  return new Map(rows.map((row) => [row.key, row.value]));
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  // Raw SQL, not Drizzle's onConflictDoUpdate({ target: settings.key }):
  // this table's actual primary key differs by mode — plain (key) when
  // self-hosted, composite (user_id, key) under EE's per-tenant RLS (see
  // packages/ee/src/db/rls-ddl.ts) — but Postgres always names a table's
  // primary key constraint "<table>_pkey" regardless of its columns, so
  // conflict-by-constraint-name resolves correctly in both without this
  // function ever needing to know which mode is active.
  await db.execute(sql`
    insert into settings (key, value, updated_at)
    values (${key}, ${value}, now())
    on conflict on constraint settings_pkey
    do update set value = excluded.value, updated_at = excluded.updated_at
  `);
}

/**
 * Atomically append `value` to a JSON-array setting, deduping — in ONE
 * lock-free upsert. Two concurrent appends can't lose an update the way a
 * read-modify-write (getSetting → push → setSetting) can, and the single
 * statement also covers the first append when no row exists yet (the SELECT ...
 * FOR UPDATE approach can't lock a row that isn't there). On insert the value
 * becomes a one-element array; on conflict we union the existing array with the
 * incoming one and keep only DISTINCT elements. Conflict-by-constraint-name for
 * the same self-host/EE reason setSetting documents above.
 */
export async function appendToSettingArray(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.execute(sql`
    insert into settings (key, value, updated_at)
    values (${key}, to_jsonb(array[${value}]::text[])::text, now())
    on conflict on constraint settings_pkey
    do update set
      value = (
        select jsonb_agg(distinct e)::text
        from jsonb_array_elements_text(
          coalesce(settings.value, '[]')::jsonb || excluded.value::jsonb
        ) as e
      ),
      updated_at = now()
  `);
}
