import { Layers3, MapPin } from "lucide-react";
import type { ReactElement } from "react";

import { CIRCLE_PREVIEW } from "./fixtures";

export function CirclesPane(): ReactElement {
  return (
    <div className="grid min-w-0 flex-1 gap-3 p-4 sm:grid-cols-[1fr_1.1fr]">
      <section className="rounded-xl border border-human/30 bg-panel p-3">
        <div className="flex items-center gap-2 text-human">
          <MapPin className="size-3.5" aria-hidden />
          <h3 className="font-display text-sm text-paper">Name this event?</h3>
        </div>
        <p className="mt-2 text-[10px] leading-4 text-fog">{CIRCLE_PREVIEW.description}</p>
        <div className="mt-3 rounded-lg border border-seam bg-well px-3 py-2 text-[10px] text-paper">
          {CIRCLE_PREVIEW.eventName}
        </div>
        <div className="mt-3 flex justify-end gap-2 text-[9px]">
          <span className="rounded-full border border-seam px-3 py-1 text-fog">Skip</span>
          <span className="rounded-full bg-human px-3 py-1 font-medium text-on-accent">Save</span>
        </div>
      </section>

      <section className="rounded-xl border border-seam bg-panel p-3">
        <div className="flex items-center gap-2">
          <Layers3 className="size-3.5 text-calm" aria-hidden />
          <h3 className="font-display text-sm text-paper">Layers &amp; circles</h3>
        </div>
        <p className="mt-1 font-mono text-[8px] uppercase tracking-wider text-fog">Circles · 1/6</p>
        <div className="mt-3 rounded-lg border border-seam bg-well px-3 py-2 text-[9px] text-fog">
          Filter types &amp; circles…
        </div>
        <div className="mt-2 divide-y divide-seam">
          {CIRCLE_PREVIEW.circles.map((circle) => (
            <div key={circle.name} className="flex items-center gap-2 py-2">
              <span className="min-w-0 flex-1 truncate text-[10px] text-paper">{circle.name}</span>
              <span className="font-mono text-[8px] text-fog">{circle.count}</span>
              <span
                className={`flex h-4 w-7 items-center rounded-full px-0.5 ${
                  circle.on ? "justify-end bg-calm" : "justify-start bg-seam"
                }`}
              >
                <span className="size-3 rounded-full bg-paper" />
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
