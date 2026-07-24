"use client";

import { cn } from "@/lib/utils";
import type { ReactElement } from "react";
import type { WrappedStats } from "@dhaga/core/src/api/wrapped";

/**
 * The owner's live, on-page view of a Wrapped card: the actual share image
 * (so the preview is exactly what will be posted) plus a richer breakdown of
 * the same figures. All contact-free — names live only in RevealToggle.
 */
export function WrappedCardPreview({
  stats,
  ogUrl,
  loading,
}: {
  stats: WrappedStats;
  ogUrl: string;
  loading?: boolean;
}): ReactElement {
  const tiles = [
    { value: stats.newPeople, label: "new people" },
    { value: stats.totalNetwork, label: "total network" },
    { value: stats.eventsAttended, label: "events" },
    { value: stats.notesWritten, label: "notes" },
    { value: stats.newConnections, label: "connections" },
    { value: stats.overdueFollowUps, label: "to follow up" },
  ];
  const maxCluster = stats.clusters[0]?.count ?? 0;

  return (
    <div className={cn("space-y-6 transition-opacity", loading && "opacity-50")}>
      {/* eslint-disable-next-line @next/next/no-img-element -- same-origin dynamic OG image, not an optimizable static asset */}
      <img
        src={ogUrl}
        alt={`${stats.scopeLabel} — ${stats.newPeople} new connections`}
        width={1200}
        height={630}
        className="w-full rounded-xl border border-seam bg-panel"
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-xl border border-seam bg-panel/40 p-4">
            <div className="font-display text-3xl tracking-tight text-paper">{tile.value}</div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-fog">
              {tile.label}
            </div>
          </div>
        ))}
      </div>

      {stats.clusters.length > 0 ? (
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fog">
            Top {stats.topCluster?.kind === "tag" ? "tags" : "circles"}
          </p>
          {stats.clusters.map((cluster) => (
            <div key={cluster.key} className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-panel">
                <div
                  className="h-full rounded-full bg-amber"
                  style={{ width: `${maxCluster > 0 ? (cluster.count / maxCluster) * 100 : 0}%` }}
                />
              </div>
              <span className="w-32 shrink-0 truncate text-sm text-paper">{cluster.key}</span>
              <span className="w-6 shrink-0 text-right text-sm text-fog">{cluster.count}</span>
            </div>
          ))}
        </div>
      ) : null}

      {stats.busiestMonth ? (
        <p className="text-sm text-fog">
          Busiest month: <span className="text-paper">{stats.busiestMonth}</span>
        </p>
      ) : null}
    </div>
  );
}
