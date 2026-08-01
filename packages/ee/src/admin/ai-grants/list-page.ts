import { sql } from "drizzle-orm";
import { openAdminConnection } from "../../db/admin-db";
import { type AiCreditGrantRecord, type GrantRow, toRecord } from "./types";

/**
 * Paginated grant ledger with the recipient's name/email joined in, for the
 * standalone /app/admin/ai-credits/grants screen. LEFT JOIN because `user_id`
 * is NULL for a broadcast grant — an inner join would silently drop those
 * rows. `search` matches the recipient's name/email; typing "everyone" (any
 * case) also surfaces broadcast grants, since they have no name/email to
 * match against.
 */
export async function listAiCreditGrantsPage({
  page,
  pageSize,
  search,
}: {
  page: number;
  pageSize: number;
  search?: string;
}): Promise<{ rows: (AiCreditGrantRecord & { userName: string | null; userEmail: string | null })[]; total: number }> {
  const term = search?.trim();
  const like = term ? `%${term}%` : null;
  const everyone = term ? term.toLowerCase().includes("everyone") : false;
  const where = like
    ? sql`where u.name ilike ${like} or u.email ilike ${like}${everyone ? sql` or g.user_id is null` : sql``}`
    : sql``;

  const { db, release } = await openAdminConnection();
  try {
    const [result, totalResult] = await Promise.all([
      db.execute(sql`
        select g.id, g.user_id, g.credits, g.reason, g.granted_by, g.starts_at, g.ends_at, g.created_at,
               (g.starts_at <= now() and (g.ends_at is null or g.ends_at > now())) as active,
               u.name as user_name, u.email as user_email
        from ai_credit_grants g
        left join "user" u on u.id = g.user_id
        ${where}
        order by g.created_at desc
        limit ${pageSize} offset ${(page - 1) * pageSize}
      `),
      db.execute(sql`
        select count(*)::int as total
        from ai_credit_grants g
        left join "user" u on u.id = g.user_id
        ${where}
      `),
    ]);
    const rows = (result.rows as unknown as (GrantRow & { user_name: string | null; user_email: string | null })[]).map((row) => ({
      ...toRecord(row),
      userName: row.user_name,
      userEmail: row.user_email,
    }));
    const total = Number((totalResult.rows[0] as { total: number } | undefined)?.total ?? 0);
    return { rows, total };
  } finally {
    await release();
  }
}
