import { getGraphActivity, getGraphStats } from "@/lib/repo/stats";
import { Sparkline } from "@/components/app/home/Sparkline";
import type { ReactElement } from "react";

/**
 * Home's "graph at a glance" metric strip: a mobile-first row of number+label
 * tiles over the signed-in user's graph, each with a sparkline of that metric's
 * new-rows-per-week over the last two months. Self-fetches its counts + activity
 * (two aggregate round-trips on one connection — no per-metric fan-out) so it
 * streams as its own Home region. Renders nothing for an empty graph — the
 * page's onboarding and per-tile empty states already cover the zero case.
 */
export async function StatStrip(): Promise<ReactElement | null> {
  const stats = await getGraphStats();
  const activity = await getGraphActivity();

  const tiles: { label: string; value: number; series: number[]; sub?: string }[] = [
    { label: "People", value: stats.contacts, series: activity.contacts },
    { label: "Companies", value: stats.companies, series: activity.companies },
    { label: "Notes", value: stats.notes, series: activity.notes },
    { label: "Facts", value: stats.facts, series: activity.facts },
    { label: "Relationships", value: stats.edges, series: activity.edges },
    { label: "Events", value: stats.events, series: activity.events },
    {
      label: "Open follow-ups",
      value: stats.openFollowUps,
      series: activity.followUps,
      sub: stats.totalFollowUps > 0 ? `of ${stats.totalFollowUps.toLocaleString()} total` : undefined,
    },
    { label: "Entities", value: stats.entities, series: activity.entities },
  ];

  const total = tiles.reduce((sum, tile) => sum + tile.value, 0);
  if (total === 0) return null;

  return (
    <section aria-label="Your graph at a glance" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="flex min-w-0 flex-col gap-1 rounded-2xl border border-seam bg-panel p-4">
          <span className="font-display text-3xl tabular-nums text-paper">{tile.value.toLocaleString()}</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-fog">{tile.label}</span>
          {tile.sub ? <span className="text-[11px] text-fog/70">{tile.sub}</span> : null}
          <Sparkline data={tile.series} className="mt-2 h-6 w-full text-amber/70" />
        </div>
      ))}
    </section>
  );
}
