import { Sparkline } from "@/components/app/home/Sparkline";
import { MOCK_HOME_STATS } from "@/utils/constants/landing";
import { HOME_STAT_TONES, HOME_STAT_TONE_FALLBACK } from "@/utils/constants/home";

export function StatStripPreview() {
  return (
    <section aria-label="Your graph at a glance" className="grid grid-cols-4 gap-1.5">
      {MOCK_HOME_STATS.map((stat) => (
        <div key={stat.label} className="rounded-lg border border-seam bg-panel p-2">
          <span className="font-display text-sm tabular-nums text-paper">{stat.value}</span>
          <span className="ml-1 font-mono text-[6px] uppercase tracking-wider text-fog">{stat.label}</span>
          <Sparkline
            data={[...stat.activity]}
            className={`mt-1 h-2 w-full ${(HOME_STAT_TONES[stat.label] ?? HOME_STAT_TONE_FALLBACK).spark}`}
          />
        </div>
      ))}
    </section>
  );
}
