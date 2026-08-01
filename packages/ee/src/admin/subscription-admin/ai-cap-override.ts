import { sql } from "drizzle-orm";
import { openAdminConnection } from "../../db/admin-db";

/**
 * The per-user monthly cloud-AI allowance override, stored in `settings`.
 * Mirrors AI_MONTHLY_CAP_OVERRIDE_KEY in apps/web/src/lib/repo/settings.ts —
 * EE must not import from apps/web (that's the wrong direction across the
 * open-core boundary), so the literal is duplicated deliberately. Keep the two
 * in sync.
 */
const AI_MONTHLY_CAP_OVERRIDE_KEY = "ai_monthly_cap_override";

/**
 * Read a user's per-user AI cap override from `settings`. Cross-tenant read
 * from an admin context, so it goes through the bypass-RLS connection with an
 * explicit user_id (there's no session for the target user). Returns null when
 * unset or not a positive integer.
 */
export async function getAiCapOverrideFor(userId: string): Promise<number | null> {
  const { db: adminDb, release } = await openAdminConnection();
  try {
    const result = await adminDb.execute(
      sql`select value from settings where user_id = ${userId} and key = ${AI_MONTHLY_CAP_OVERRIDE_KEY} limit 1`,
    );
    const value = (result.rows[0] as { value: string } | undefined)?.value;
    if (value == null) return null;
    const n = Number.parseInt(value, 10);
    return Number.isInteger(n) && n > 0 ? n : null;
  } finally {
    await release();
  }
}

/**
 * Set (or clear, when `cap` is null) a user's per-user AI cap override. Uses the
 * bypass-RLS connection with an explicit user_id. The conflict target is the
 * composite primary key (user_id, key) — under EE that constraint is named
 * `settings_pkey` (see rls-ddl.ts), same name core's single-user (key) PK uses,
 * so `on constraint settings_pkey` resolves in both.
 */
export async function setAiCapOverrideFor(userId: string, cap: number | null): Promise<void> {
  const { db: adminDb, release } = await openAdminConnection();
  try {
    if (cap === null) {
      await adminDb.execute(
        sql`delete from settings where user_id = ${userId} and key = ${AI_MONTHLY_CAP_OVERRIDE_KEY}`,
      );
    } else {
      await adminDb.execute(sql`
        insert into settings (user_id, key, value, updated_at)
        values (${userId}, ${AI_MONTHLY_CAP_OVERRIDE_KEY}, ${String(cap)}, now())
        on conflict on constraint settings_pkey
        do update set value = excluded.value, updated_at = excluded.updated_at
      `);
    }
  } finally {
    await release();
  }
}
