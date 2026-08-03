import { Check, Copy } from "lucide-react";
import type { ReactElement } from "react";

import { DRAFT_PREVIEW } from "./fixtures";

export function DraftPane(): ReactElement {
  return (
    <div className="flex min-w-0 flex-1 flex-col p-5">
      <div className="rounded-xl border border-seam bg-panel p-4 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-base text-paper">Follow-up draft</h3>
          <span className="rounded-full bg-amber px-3 py-1.5 text-[10px] font-semibold text-on-accent">
            Redraft ✦
          </span>
        </div>
        <div className="mt-3 min-h-32 whitespace-pre-wrap rounded-lg border border-line bg-well px-3 py-2.5 text-[11px] leading-5 text-paper">
          {DRAFT_PREVIEW.body}
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="max-w-xs text-[9px] leading-4 text-fog">
            Uses their facts, notes, and where you met — editable before you copy it.
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-seam px-3 py-1.5 text-[10px] text-fog">
            <Copy className="size-3" aria-hidden /> Copy
          </span>
        </div>
        <p className="mt-3 flex items-center gap-1.5 border-t border-seam pt-3 text-[9px] text-calm">
          <Check className="size-3" aria-hidden /> Ready to edit or copy — Dhaga never sends on your behalf.
        </p>
      </div>
    </div>
  );
}
