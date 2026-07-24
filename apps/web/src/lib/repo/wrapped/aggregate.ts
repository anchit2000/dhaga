import {
  buildAggregateSql,
  buildCompanyClustersSql,
  buildTagClustersSql,
} from "./aggregate-sql";
import type { DhagaDb } from "@/lib/db";
import type { WrappedCluster, WrappedScopeKind } from "@dhaga/core/src/api/wrapped";

/**
 * Executes the Network Wrapped aggregates: two round-trips (scalar counts, then
 * the cluster group-by) run sequentially on ONE getDb() connection — never a
 * Promise.all fan-out (which would exhaust the max-3 tenant pool). Zero LLM.
 */

export interface WrappedScopeCtx {
  kind: WrappedScopeKind;
  start: Date | null;
  end: Date | null;
  eventId?: string;
}

/** camelCase view of the aggregate row, ready to spread onto WrappedStats. */
export interface WrappedCounts {
  newPeople: number;
  totalNetwork: number;
  eventsAttended: number;
  biggestEventCount: number;
  overdueFollowUps: number;
  notesWritten: number;
  newConnections: number;
  busiestMonth: string | null;
  topCompanyName: string | null;
  mostConnectedName: string | null;
}

interface AggregateRow {
  new_people: number;
  total_network: number;
  events_attended: number;
  biggest_event_count: number;
  overdue_follow_ups: number;
  notes_written: number;
  new_connections: number;
  busiest_month: string | null;
  top_company: string | null;
  most_connected: string | null;
}

interface ClusterRow {
  key: string;
  count: number;
}

const EMPTY: WrappedCounts = {
  newPeople: 0,
  totalNetwork: 0,
  eventsAttended: 0,
  biggestEventCount: 0,
  overdueFollowUps: 0,
  notesWritten: 0,
  newConnections: 0,
  busiestMonth: null,
  topCompanyName: null,
  mostConnectedName: null,
};

export async function fetchWrappedAggregate(
  db: DhagaDb,
  ctx: WrappedScopeCtx,
): Promise<WrappedCounts> {
  const result = (await db.execute(buildAggregateSql(ctx))) as unknown as {
    rows: AggregateRow[];
  };
  const row = result.rows[0];
  if (!row) return EMPTY;
  return {
    newPeople: row.new_people,
    totalNetwork: row.total_network,
    eventsAttended: row.events_attended,
    biggestEventCount: row.biggest_event_count,
    overdueFollowUps: row.overdue_follow_ups,
    notesWritten: row.notes_written,
    newConnections: row.new_connections,
    busiestMonth: row.busiest_month,
    topCompanyName: row.top_company,
    mostConnectedName: row.most_connected,
  };
}

/** Company-first, tag-fallback (never sector — too sparse) distribution. */
export async function fetchWrappedClusters(
  db: DhagaDb,
  ctx: WrappedScopeCtx,
): Promise<{ clusters: WrappedCluster[]; topCluster: WrappedCluster | null }> {
  const byCompany = (await db.execute(buildCompanyClustersSql(ctx))) as unknown as {
    rows: ClusterRow[];
  };

  let clusters: WrappedCluster[];
  if (byCompany.rows.length > 0) {
    clusters = byCompany.rows.map((row) => ({ key: row.key, kind: "company" as const, count: row.count }));
  } else {
    const byTag = (await db.execute(buildTagClustersSql(ctx))) as unknown as {
      rows: ClusterRow[];
    };
    clusters = byTag.rows.map((row) => ({ key: row.key, kind: "tag" as const, count: row.count }));
  }
  return { clusters, topCluster: clusters[0] ?? null };
}
