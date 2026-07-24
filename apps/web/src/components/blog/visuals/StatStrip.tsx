import { Figure } from "@/components/blog/visuals/Figure";
import type { CSSProperties, ReactElement } from "react";

interface Stat {
  value: string;
  label: string;
}

interface StatStripProps {
  stats: Stat[];
  caption?: string;
}

// auto-fit keeps the tiles a single row on wide screens and wraps them to two
// (or one) columns on narrow screens, for any number of stats.
const GRID_STYLE: CSSProperties = {
  gridTemplateColumns: "repeat(auto-fit, minmax(7rem, 1fr))",
};

// A responsive row of stat tiles: a large amber value over a small fog label.
export function StatStrip({ stats, caption }: StatStripProps): ReactElement {
  return (
    <Figure caption={caption}>
      <dl className="grid gap-3" style={GRID_STYLE}>
        {stats.map((stat, index) => (
          <div
            key={index}
            className="rounded-lg border border-seam bg-panel-2 px-4 py-4"
          >
            <dd className="font-mono text-2xl font-semibold text-amber sm:text-3xl">
              {stat.value}
            </dd>
            <dt className="mt-1 text-xs text-fog">{stat.label}</dt>
          </div>
        ))}
      </dl>
    </Figure>
  );
}
