import { getGraphStats } from "@/lib/repo/stats";
import type { ReactElement } from "react";

/**
 * Home's "graph at a glance" metric strip: a mobile-first row of number+label
 * tiles over the signed-in user's graph. Self-fetches its single aggregate
 * count query (lib/repo/stats.ts) so it streams as its own Home region. Renders
 * nothing for an empty graph — the page's onboarding and per-tile empty states
 * already cover the zero case, so a brand-new user isn't met by a wall of zeros.
 */
export async function StatStrip(): Promise<ReactElement | null> {
  const stats = await getGraphStats();

  const tiles: { label: string; value: number; sub?: string }[] = [
    { label: "People", value: stats.contacts },
    { label: "Companies", value: stats.companies },
    { label: "Notes", value: stats.notes },
    { label: "Facts", value: stats.facts },
    { label: "Relationships", value: stats.edges },
    { label: "Events", value: stats.events },
    {
      label: "Open follow-ups",
      value: stats.openFollowUps,
      sub: stats.totalFollowUps > 0 ? `of ${stats.totalFollowUps.toLocaleString()} total` : undefined,
    },
    { label: "Entities", value: stats.entities },
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
        </div>
      ))}
    </section>
  );
}
