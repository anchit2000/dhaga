import { Camera, Check, Mic, Search, Upload, UserPlus } from "lucide-react";
import {
  MOCK_CAPTURE_ACTIONS,
  MOCK_HOME_EVENTS,
  MOCK_HOME_FOLLOWUPS,
  MOCK_HOME_PEOPLE,
  MOCK_HOME_TODAY,
} from "@/utils/constants/landing";
import { Headshot } from "../Headshot";

export function DashboardPreview() {
  return (
    <div className="relative min-w-0 flex-1 bg-ink text-left">
      <div className="flex h-11 items-center gap-3 border-b border-seam px-4">
        <span className="font-display text-sm text-paper">dhaga</span>
        <span className="rounded-full bg-amber/15 px-2.5 py-1 text-[10px] text-amber">Home</span>
        <span className="text-[10px] text-fog">Graph</span>
        <div className="ml-auto flex w-1/2 items-center gap-1.5 rounded-full border border-seam bg-panel px-2.5 py-1 text-fog">
          <Search className="size-3" />
          <span className="text-[9px]">Search your network…</span>
        </div>
        <span className="flex size-6 items-center justify-center rounded-full border border-seam text-[9px] text-fog">AC</span>
      </div>

      <div className="space-y-3 p-4 pb-16">
        <div>
          <p className="font-mono text-[8px] uppercase tracking-widest text-ember">Friday · 17 Jul</p>
          <p className="font-display text-lg text-paper">3 threads to pull today</p>
        </div>

        <div className="grid grid-cols-[1.5fr_1fr] gap-3">
          <section className="row-span-2 rounded-lg border border-amber/25 bg-panel bg-gradient-to-br from-amber/[0.06] to-transparent p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-paper">Today</span>
              <span className="font-mono text-[8px] uppercase tracking-widest text-fog">3 people</span>
            </div>
            <div className="mt-2 divide-y divide-seam">
              {MOCK_HOME_TODAY.map((person) => (
                <div key={person.personId} className="flex items-center gap-2 py-2 first:pt-0 last:pb-0">
                  <Headshot personId={person.personId} className="size-5" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[9px] text-paper">{person.name}</p>
                    <p className="truncate text-[8px] text-fog">{person.reason}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-seam px-1.5 py-0.5 text-[7px] text-fog">Reached out</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-seam bg-panel p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-paper">Follow-ups</span>
              <span className="font-mono text-[8px] uppercase tracking-widest text-fog">2 open</span>
            </div>
            <div className="mt-2 space-y-1.5">
              {MOCK_HOME_FOLLOWUPS.map((item) => (
                <div key={item.action} className="flex items-start gap-1.5">
                  <span className="mt-px flex size-3 shrink-0 items-center justify-center rounded-full border border-seam">
                    <Check className="size-2 text-fog" />
                  </span>
                  <p className="min-w-0 flex-1 text-[8px] leading-snug text-fog">
                    {item.action} <span className="text-amber">{item.contact}</span>
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-seam bg-panel p-3">
            <p className="text-xs font-medium text-paper">Recent people</p>
            <div className="mt-2 space-y-1.5">
              {MOCK_HOME_PEOPLE.map((name) => (
                <p key={name} className="truncate text-[9px] text-fog">{name}</p>
              ))}
            </div>
            <p className="mt-2 text-[9px] text-ember">View all people</p>
          </section>

          <section className="col-span-2 rounded-lg border border-seam bg-panel p-3">
            <p className="text-xs font-medium text-paper">Recent events</p>
            <div className="mt-2 space-y-1.5">
              {MOCK_HOME_EVENTS.map((name) => (
                <p key={name} className="truncate text-[9px] text-fog">{name}</p>
              ))}
            </div>
            <p className="mt-2 text-[9px] text-ember">+ Create event</p>
          </section>
        </div>
      </div>

      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1 rounded-2xl border border-wash/15 bg-panel-2/90 p-1.5 shadow-xl">
        {MOCK_CAPTURE_ACTIONS.map((label) => (
          <div key={label} className="flex min-w-10 flex-col items-center gap-0.5 text-[7px] text-fog">
            <span className="flex size-7 items-center justify-center rounded-full border border-seam">{captureIcon(label)}</span>
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function captureIcon(label: (typeof MOCK_CAPTURE_ACTIONS)[number]) {
  if (label === "Capture") return <UserPlus className="size-3" />;
  if (label === "Voice") return <Mic className="size-3" />;
  if (label === "Camera") return <Camera className="size-3" />;
  return <Upload className="size-3" />;
}
