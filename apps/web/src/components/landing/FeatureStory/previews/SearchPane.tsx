import { Check, Search, Sparkles } from "lucide-react";
import type { ReactElement } from "react";

import { SEARCH_PREVIEW } from "./fixtures";

export function SearchPane(): ReactElement {
  return (
    <div className="flex min-w-0 flex-1 flex-col p-4">
      <div className="overflow-hidden rounded-xl border border-seam bg-panel shadow-lg">
        <div className="border-b border-seam p-3">
          <div className="flex items-center gap-2">
            <Search className="size-4 text-fog" aria-hidden />
            <span className="flex-1 text-sm text-paper">{SEARCH_PREVIEW.query}</span>
            <span className="rounded-md border border-seam px-1.5 py-0.5 font-mono text-[9px] text-fog">ESC</span>
          </div>
          <div className="mt-2 flex gap-4 text-xs">
            <span className="flex items-center gap-1 text-fog"><Search className="size-3" /> Search</span>
            <span className="flex items-center gap-1 border-b border-amber pb-1 text-paper">
              <Sparkles className="size-3 text-ember" /> Ask Dhaga
            </span>
          </div>
        </div>
        <div className="grid gap-3 p-3 sm:grid-cols-[1fr_0.58fr]">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 rounded-xl border border-amber/25 bg-amber/[0.05] p-2.5">
              <span className="text-[10px] leading-4 text-fog">Get a reasoned answer with receipts.</span>
              <span className="shrink-0 rounded-full bg-amber px-2.5 py-1 text-[9px] font-semibold text-on-accent">
                Ask Dhaga ✦
              </span>
            </div>
            <div className="space-y-1">
              {SEARCH_PREVIEW.steps.map((step) => (
                <p key={step} className="flex items-center gap-1.5 text-[9px] text-fog">
                  <Check className="size-3 text-calm" aria-hidden /> {step}
                </p>
              ))}
            </div>
            <p className="text-[11px] leading-5 text-paper">{SEARCH_PREVIEW.answer}</p>
          </div>
          <div className="border-t border-seam pt-3 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
            <p className="font-mono text-[9px] uppercase tracking-wide text-fog">Receipts</p>
            <div className="mt-2 space-y-1.5">
              {SEARCH_PREVIEW.receipts.map((receipt) => (
                <div key={receipt} className="rounded-lg border border-seam bg-well px-2.5 py-2 text-[9px] text-paper">
                  {receipt}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
