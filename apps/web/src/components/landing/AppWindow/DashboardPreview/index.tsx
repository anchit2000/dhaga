import { Camera, Mic, Search, Upload, UserPlus } from "lucide-react";
import { MOCK_CAPTURE_ACTIONS, MOCK_HOME_STATUS } from "@/utils/constants/landing";
import { GoingQuietTile, InboxBanner, SignalsTile } from "./intelligence";
import { FollowUpsTile, RecentPeopleTile, TodayTile } from "./tiles";

/**
 * Hero product shot: a miniature of today's Home dashboard — the daily-briefing
 * header (dayline + headline + status line) over a bento grid that leads with
 * the relationship inbox, keeps "Today" as the 2×2 hero, and gives the right
 * rail to the proactive-intelligence tiles (Signals, Going quiet). Content data
 * lives in utils/constants/landing/appmock.ts.
 */
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
          <p className="mt-1 font-mono text-[8px] uppercase tracking-wider text-fog">{MOCK_HOME_STATUS}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <InboxBanner />
          <TodayTile />
          <SignalsTile />
          <GoingQuietTile />
          <FollowUpsTile />
          <RecentPeopleTile />
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
