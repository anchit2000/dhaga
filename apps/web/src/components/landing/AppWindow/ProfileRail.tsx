import { MOCK_PROFILE_FACTS, MOCK_TIMELINE } from "@/utils/constants/landing";
import { Headshot } from "../Headshot";

export function ProfileRail() {
  return (
    <div className="hidden w-56 shrink-0 flex-col bg-panel-2/40 p-4 text-left lg:flex">
      <div className="flex items-center gap-2.5">
        <Headshot personId="sarah" className="size-9" />
        <div>
          <p className="text-sm font-medium text-paper">Sarah Chen</p>
          <p className="text-[10px] text-fog">ex-Stripe · Web Summit 2026</p>
        </div>
      </div>

      <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-fog/70">
        Facts · with receipts
      </p>
      <div className="mt-1.5 space-y-2">
        {MOCK_PROFILE_FACTS.map((fact) => (
          <div key={fact.text} className="border-l-2 border-amber/50 pl-2">
            <p className="text-[11px] leading-snug text-paper">{fact.text}</p>
            <p className="text-[9px] italic text-fog/70">{fact.source}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-fog/70">
        Thread
      </p>
      <div className="mt-1.5 space-y-1.5">
        {MOCK_TIMELINE.map((entry) => (
          <div key={entry.label} className="flex items-baseline justify-between gap-2">
            <p className="text-[10px] text-fog">{entry.label}</p>
            <span className="shrink-0 font-mono text-[9px] text-fog/60">{entry.date}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-4">
        <div className="rounded-md border border-amber/40 bg-amber/10 px-3 py-2 text-center text-[11px] font-medium text-amber">
          Draft follow-up ✦
        </div>
      </div>
    </div>
  );
}
