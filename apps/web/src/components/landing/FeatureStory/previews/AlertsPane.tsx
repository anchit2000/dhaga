import type { ReactElement } from "react";

import { QUIET_PREVIEW, SIGNAL_PREVIEW } from "./fixtures";

export function AlertsPane(): ReactElement {
  return (
    <div className="grid min-w-0 flex-1 gap-3 p-4 sm:grid-cols-2">
      <section className="rounded-xl border border-magic/30 bg-panel p-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display text-sm text-paper">Signals</h3>
          <span className="font-mono text-[8px] uppercase tracking-wider text-fog">1 new</span>
        </div>
        <div className="mt-3 rounded-lg border border-magic/25 bg-magic/[0.05] p-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-magic/40 px-2 py-0.5 text-[8px] text-magic">
              {SIGNAL_PREVIEW.kind}
            </span>
            <span className="text-[10px] font-medium text-paper">{SIGNAL_PREVIEW.person}</span>
            <span className="text-[8px] text-fog">{SIGNAL_PREVIEW.company}</span>
          </div>
          <p className="mt-1.5 text-[10px] text-paper">{SIGNAL_PREVIEW.headline}</p>
          <p className="mt-0.5 text-[8px] text-fog">{SIGNAL_PREVIEW.detail}</p>
          <div className="mt-2 flex gap-1.5">
            <span className="rounded-full border border-magic/40 px-2 py-1 text-[8px] text-magic">Add as note</span>
            <span className="rounded-full border border-seam px-2 py-1 text-[8px] text-fog">Dismiss</span>
          </div>
        </div>
      </section>
      <section className="rounded-xl border border-human/30 bg-panel p-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display text-sm text-paper">Going quiet</h3>
          <span className="font-mono text-[8px] uppercase tracking-wider text-fog">1 fading</span>
        </div>
        <div className="mt-3 border-y border-seam py-3">
          <p className="text-[10px] font-medium text-paper">{QUIET_PREVIEW.person}</p>
          <p className="mt-0.5 text-[8px] text-fog">{QUIET_PREVIEW.role} · {QUIET_PREVIEW.lastTouch}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-seam px-2 py-1 text-[8px] text-fog">{QUIET_PREVIEW.strength}</span>
            <span className="rounded-full border border-amber/40 px-2 py-1 text-[8px] text-ember">I reached out ✓</span>
          </div>
        </div>
      </section>
    </div>
  );
}
