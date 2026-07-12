import { Camera, Mic, Search, Upload, UserPlus } from "lucide-react";
import {
  MOCK_CAPTURE_ACTIONS,
  MOCK_FEED,
  MOCK_HOME_PEOPLE,
  MOCK_HOME_EVENTS,
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
          <p className="font-mono text-[8px] uppercase tracking-widest text-amber">Your network, threaded</p>
          <p className="font-display text-lg text-paper">Home</p>
        </div>

        <section className="overflow-hidden rounded-lg border border-seam bg-panel">
          <div className="flex items-center justify-between border-b border-seam px-3 py-2">
            <span className="text-xs font-medium text-paper">Updates</span>
            <span className="font-mono text-[8px] uppercase tracking-widest text-amber">Today</span>
          </div>
          {MOCK_FEED.slice(0, 3).map((item) => (
            <div key={item.text} className="flex items-center gap-2 border-b border-seam/60 px-3 py-2 last:border-0">
              {item.personId ? <Headshot personId={item.personId} className="size-5" /> : <span className="size-5 rounded-full bg-amber/15" />}
              <span className="min-w-0 flex-1 truncate text-[9px] text-fog">{item.text}</span>
              <span className="font-mono text-[8px] text-fog/60">{item.time}</span>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-2 gap-3">
          <PreviewList title="Recent people" items={MOCK_HOME_PEOPLE} action="View all people" />
          <PreviewList title="Recent events" items={MOCK_HOME_EVENTS} action="+ Create event" />
        </div>
      </div>

      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1 rounded-2xl border border-paper/15 bg-panel-2/90 p-1.5 shadow-xl">
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

function PreviewList({ title, items, action }: { title: string; items: readonly string[]; action: string }) {
  return (
    <section className="rounded-lg border border-seam bg-panel p-3">
      <p className="text-xs font-medium text-paper">{title}</p>
      <div className="mt-2 space-y-1.5">{items.map((item) => <p key={item} className="truncate text-[9px] text-fog">{item}</p>)}</div>
      <p className="mt-2 text-[9px] text-amber">{action}</p>
    </section>
  );
}
