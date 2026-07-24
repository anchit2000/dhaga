import { sql, type SQL } from "drizzle-orm";
import { WRAPPED_CLUSTER_TOP_N } from "@/utils/constants/wrapped";
import type { WrappedScopeCtx } from "./aggregate";

/**
 * SQL builders for Network Wrapped. Every scalar metric is one subquery in a
 * single round-trip (the fetchGraphVersion idiom) so a whole card is two
 * queries and never fans getDb() out across the max-3 tenant pool. RLS scopes
 * every table; the `mentioned` stubs are excluded from all people counts.
 */

// `col` is always an internal literal (never user input) — sql.raw is safe.
const since = (col: string, start: Date | null): SQL =>
  start ? sql` AND ${sql.raw(col)} >= ${start}` : sql``;
const until = (col: string, end: Date | null): SQL =>
  end ? sql` AND ${sql.raw(col)} < ${end}` : sql``;

const OVERDUE = sql`(SELECT count(*)::int FROM follow_ups WHERE status = 'open' AND due_date IS NOT NULL AND due_date < now())`;
const NETWORK = sql`(SELECT count(*)::int FROM contacts WHERE source <> 'mentioned')`;

function windowAggregate(start: Date | null, end: Date | null): SQL {
  const c = (col: string): SQL => sql`${since(col, start)}${until(col, end)}`;
  return sql`
    SELECT
      (SELECT count(*)::int FROM contacts WHERE source <> 'mentioned'${c("created_at")}) AS new_people,
      ${NETWORK} AS total_network,
      (SELECT count(*)::int FROM events WHERE true${c("started_at")}) AS events_attended,
      (SELECT COALESCE(MAX(cnt), 0)::int FROM (
        SELECT count(*) AS cnt FROM event_contacts ec JOIN events e ON e.id = ec.event_id
        WHERE true${c("e.started_at")} GROUP BY ec.event_id) t) AS biggest_event_count,
      ${OVERDUE} AS overdue_follow_ups,
      (SELECT count(*)::int FROM notes WHERE deleted_at IS NULL${c("created_at")}) AS notes_written,
      (SELECT count(*)::int FROM edges WHERE deleted_at IS NULL${c("created_at")}) AS new_connections,
      (SELECT to_char(date_trunc('month', created_at), 'FMMonth') FROM contacts
        WHERE source <> 'mentioned'${c("created_at")}
        GROUP BY 1 ORDER BY count(*) DESC LIMIT 1) AS busiest_month,
      (SELECT co.name FROM contacts c JOIN companies co ON co.id = c.company_id
        WHERE c.source <> 'mentioned'${c("c.created_at")}
        GROUP BY co.name ORDER BY count(*) DESC, co.name LIMIT 1) AS top_company,
      (SELECT c.name FROM contacts c
        LEFT JOIN edges g ON g.deleted_at IS NULL
          AND ((g.src_type = 'contact' AND g.src_id = c.id) OR (g.dst_type = 'contact' AND g.dst_id = c.id))
        WHERE c.source <> 'mentioned'${c("c.created_at")}
        GROUP BY c.id, c.name ORDER BY count(g.id) DESC, c.name LIMIT 1) AS most_connected
  `;
}

function eventAggregate(eventId: string): SQL {
  const members = sql`(SELECT contact_id FROM event_contacts WHERE event_id = ${eventId})`;
  const met = sql`(SELECT count(*)::int FROM event_contacts ec JOIN contacts c ON c.id = ec.contact_id
    WHERE ec.event_id = ${eventId} AND c.source <> 'mentioned')`;
  return sql`
    SELECT
      ${met} AS new_people,
      ${NETWORK} AS total_network,
      1 AS events_attended,
      ${met} AS biggest_event_count,
      ${OVERDUE} AS overdue_follow_ups,
      (SELECT count(*)::int FROM notes WHERE deleted_at IS NULL AND contact_id IN ${members}) AS notes_written,
      (SELECT count(*)::int FROM edges WHERE deleted_at IS NULL AND (
        (src_type = 'contact' AND src_id IN ${members}) OR (dst_type = 'contact' AND dst_id IN ${members}))) AS new_connections,
      NULL::text AS busiest_month,
      (SELECT co.name FROM contacts c JOIN companies co ON co.id = c.company_id
        WHERE c.source <> 'mentioned' AND c.id IN ${members}
        GROUP BY co.name ORDER BY count(*) DESC, co.name LIMIT 1) AS top_company,
      (SELECT c.name FROM contacts c
        LEFT JOIN edges g ON g.deleted_at IS NULL
          AND ((g.src_type = 'contact' AND g.src_id = c.id) OR (g.dst_type = 'contact' AND g.dst_id = c.id))
        WHERE c.source <> 'mentioned' AND c.id IN ${members}
        GROUP BY c.id, c.name ORDER BY count(g.id) DESC, c.name LIMIT 1) AS most_connected
  `;
}

export function buildAggregateSql(ctx: WrappedScopeCtx): SQL {
  return ctx.kind === "event" && ctx.eventId
    ? eventAggregate(ctx.eventId)
    : windowAggregate(ctx.start, ctx.end);
}

function contactScopeCond(ctx: WrappedScopeCtx): SQL {
  if (ctx.kind === "event" && ctx.eventId) {
    return sql` AND c.id IN (SELECT contact_id FROM event_contacts WHERE event_id = ${ctx.eventId})`;
  }
  return sql`${since("c.created_at", ctx.start)}${until("c.created_at", ctx.end)}`;
}

export function buildCompanyClustersSql(ctx: WrappedScopeCtx): SQL {
  return sql`
    SELECT co.name AS key, count(*)::int AS count
    FROM contacts c JOIN companies co ON co.id = c.company_id
    WHERE c.source <> 'mentioned'${contactScopeCond(ctx)}
    GROUP BY co.name ORDER BY count(*) DESC, co.name LIMIT ${WRAPPED_CLUSTER_TOP_N}
  `;
}

export function buildTagClustersSql(ctx: WrappedScopeCtx): SQL {
  return sql`
    SELECT tag AS key, count(*)::int AS count FROM (
      SELECT jsonb_array_elements_text(c.tags) AS tag FROM contacts c
      WHERE c.source <> 'mentioned'${contactScopeCond(ctx)}
    ) s WHERE tag <> '' GROUP BY tag ORDER BY count(*) DESC, tag LIMIT ${WRAPPED_CLUSTER_TOP_N}
  `;
}
