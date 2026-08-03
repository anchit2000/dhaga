import { sql } from "drizzle-orm";
import { openAdminConnection } from "../../db/admin-db";

/**
 * In-app feedback, admin side.
 *
 * Reads go through the bypass-RLS connection because an operator is reading
 * other people's rows and there is no session for them — the same reason the
 * grant ledger does. Core never reads this table back; the user writes a report
 * and it is the maintainer's to answer.
 *
 * The `user` join is the ONLY place a report is resolved to a person: the row
 * itself carries just the RLS `user_id`, and the owner notification email
 * carries only that id, so a report can be answered without an address being
 * copied into a mailbox.
 */
export interface FeedbackAdminRow {
  id: string;
  message: string;
  route: string;
  viewport: string | null;
  userAgent: string | null;
  locale: string | null;
  timezone: string | null;
  appVersion: string | null;
  createdAt: Date;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
}

interface RawRow {
  id: string;
  message: string;
  route: string;
  viewport: string | null;
  user_agent: string | null;
  locale: string | null;
  timezone: string | null;
  app_version: string | null;
  /** Drizzle's node-postgres driver hands raw-SQL timestamps back as STRINGS,
   *  not Dates — `db.execute()` skips the typed mapping a `.select()` would do.
   *  Coerced below; without it the table renders `Invalid time value`. */
  created_at: string | Date;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
}

function toRow(row: RawRow): FeedbackAdminRow {
  return {
    id: row.id,
    message: row.message,
    route: row.route,
    viewport: row.viewport,
    userAgent: row.user_agent,
    locale: row.locale,
    timezone: row.timezone,
    appVersion: row.app_version,
    createdAt: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
  };
}

/**
 * One page of reports, newest first. Server-side `limit`/`offset` rather than
 * loading the table and paging in the browser — this grows without bound and
 * every row carries a user's prose.
 *
 * The two queries are awaited SEQUENTIALLY on the one admin connection: they
 * share a client, so a `Promise.all` would only pipeline them behind each other
 * while making the failure mode harder to read.
 */
export async function listFeedbackPage({
  page,
  pageSize,
}: {
  page: number;
  pageSize: number;
}): Promise<{ rows: FeedbackAdminRow[]; total: number }> {
  const { db, release } = await openAdminConnection();
  try {
    const result = await db.execute(sql`
      select f.id, f.message, f.route, f.viewport, f.user_agent, f.locale, f.timezone,
             f.app_version, f.created_at, f.user_id,
             u.name as user_name, u.email as user_email
      from feedback f
      left join "user" u on u.id = f.user_id
      order by f.created_at desc
      limit ${pageSize} offset ${(page - 1) * pageSize}
    `);
    const totalResult = await db.execute(sql`select count(*)::int as total from feedback`);
    const total = Number((totalResult.rows[0] as { total: number } | undefined)?.total ?? 0);
    return { rows: (result.rows as unknown as RawRow[]).map(toRow), total };
  } finally {
    await release();
  }
}
