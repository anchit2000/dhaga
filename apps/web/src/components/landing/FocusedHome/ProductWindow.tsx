import type { ReactElement } from "react";

import { FileText, MessageSquareText, Mic, Search } from "lucide-react";

import { Headshot } from "@/components/landing/Headshot";
import { Shell } from "@/components/landing/AppWindow/Shell";
import { FOCUSED_CONTEXT, FOCUSED_PEOPLE } from "@/utils/constants/landing/focused";

export function ProductWindow(): ReactElement {
  return (
    <div className="h-44 min-w-0 overflow-hidden rounded-2xl drop-shadow-2xl sm:h-72 lg:h-auto lg:overflow-visible">
      <Shell className="w-[680px] origin-top-left scale-[0.48] sm:scale-[0.82] lg:w-auto lg:scale-100">
        <div className="flex min-w-0 flex-1 bg-ink font-ui text-left">
          <div className="w-64 shrink-0 border-r border-seam p-3">
            <div className="flex h-9 items-center gap-2 rounded-lg border border-seam bg-well px-3 text-xs text-fog">
              <Search className="size-3.5" aria-hidden="true" /> Search people
            </div>
            <div className="mt-3 space-y-1">
              {FOCUSED_PEOPLE.map((person, index) => (
                <div key={person.id} className={`flex gap-3 rounded-lg p-2.5 ${index === 0 ? "bg-panel-2" : ""}`}>
                  <Headshot personId={person.id} className="size-8" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-paper">{person.name}</p>
                    <p className="truncate text-[10px] text-fog">{person.detail}</p>
                    <p className="truncate text-[9px] text-fog">{person.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="min-w-0 flex-1 p-5">
            <div className="flex items-center gap-3">
              <Headshot personId="sarah" className="size-11" />
              <div><p className="text-base font-medium text-paper">Sarah Chen</p><p className="text-xs text-fog">Stripe · Growth</p></div>
            </div>
            <div className="mt-5 flex gap-5 border-b border-seam text-xs"><span className="border-b border-amber pb-2 text-paper">Context</span><span className="text-fog">Notes 3</span><span className="text-fog">Activity</span></div>
            <div className="mt-3 space-y-2">
              {FOCUSED_CONTEXT.map((item, index) => (
                <div key={item.label} className="flex items-center gap-3 rounded-lg border border-seam p-3">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-panel-2 text-ember">{index === 0 ? <FileText className="size-4" /> : index === 1 ? <Mic className="size-4" /> : <MessageSquareText className="size-4" />}</span>
                  <div className="min-w-0 flex-1"><p className="text-xs text-paper">{item.label}</p><p className="truncate text-[10px] text-fog">{item.detail}</p></div>
                  <span className="text-[10px] text-ember">{item.action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Shell>
    </div>
  );
}
