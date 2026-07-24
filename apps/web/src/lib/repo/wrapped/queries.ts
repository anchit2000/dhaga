import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { events } from "@/lib/db/schema";
import { TABLE_FILTER_OPTION_LIMIT } from "@/utils/constants/table";
import { resolveScope, WRAPPED_WINDOW_OPTIONS } from "@/lib/wrapped/scope";
import {
  fetchWrappedAggregate,
  fetchWrappedClusters,
  type WrappedScopeCtx,
} from "./aggregate";
import type {
  WrappedScope,
  WrappedScopeOption,
  WrappedStats,
} from "@dhaga/core/src/api/wrapped";

/**
 * Network Wrapped read model. One getDb() per call; the aggregate + cluster
 * queries run sequentially on it (no fan-out). `reveal` (the two name-bearing
 * fields) is always computed for the owner here — callers that serve a public
 * surface never read it and never place it into a share URL or image.
 */
export async function getNetworkWrapped(scope: WrappedScope): Promise<WrappedStats> {
  const db = await getDb();

  let scopeLabel: string;
  let start: Date | null = null;
  let end: Date | null = null;
  let eventId: string | undefined;

  if (scope.kind === "event" && scope.eventId) {
    eventId = scope.eventId;
    const [row] = await db
      .select({ name: events.name })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    scopeLabel = row?.name ?? "Event";
  } else {
    const window = resolveScope(scope);
    scopeLabel = window.label;
    start = window.start;
    end = window.end;
  }

  const ctx: WrappedScopeCtx = { kind: scope.kind, start, end, eventId };
  const counts = await fetchWrappedAggregate(db, ctx);
  const { clusters, topCluster } = await fetchWrappedClusters(db, ctx);

  return {
    scope,
    scopeLabel,
    periodStart: start ? start.toISOString() : null,
    periodEnd: end ? end.toISOString() : null,
    newPeople: counts.newPeople,
    totalNetwork: counts.totalNetwork,
    eventsAttended: counts.eventsAttended,
    biggestEventCount: counts.biggestEventCount,
    overdueFollowUps: counts.overdueFollowUps,
    notesWritten: counts.notesWritten,
    newConnections: counts.newConnections,
    topCluster,
    clusters,
    busiestMonth: counts.busiestMonth,
    reveal: {
      topCompanyName: counts.topCompanyName,
      mostConnectedName: counts.mostConnectedName,
    },
  };
}

/** Fixed windows plus the user's events, for the scope picker. */
export async function listWrappedScopeOptions(): Promise<WrappedScopeOption[]> {
  const db = await getDb();
  const rows = await db
    .select({ id: events.id, name: events.name })
    .from(events)
    .orderBy(desc(events.startedAt))
    .limit(TABLE_FILTER_OPTION_LIMIT);
  const eventOptions: WrappedScopeOption[] = rows.map((row) => ({
    kind: "event",
    label: row.name,
    eventId: row.id,
  }));
  return [...WRAPPED_WINDOW_OPTIONS, ...eventOptions];
}
