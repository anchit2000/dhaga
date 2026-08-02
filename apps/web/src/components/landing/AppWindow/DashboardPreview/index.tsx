import { AppPreviewNav } from "./nav";
import { StatStripPreview } from "./stats";
import { ConfirmationsTile, SignalsTile } from "./intelligence";
import {
  FollowUpsTile,
  RecentEventsTile,
  RecentPeopleTile,
  TodayTile,
} from "./tiles";
import { CaptureDockPreview } from "./capture-dock";
import { MOCK_HOME_STATUS, MOCK_HOME_TODAY } from "@/utils/constants/landing";

/** Static miniature of the real signed-in Home hierarchy. */
export function DashboardPreview() {
  return (
    <div className="relative min-w-0 flex-1 bg-ink text-left">
      <AppPreviewNav />
      <div className="space-y-4 p-4 pb-20">
        <StatStripPreview />
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[8px] uppercase tracking-widest text-ember">Friday · 17 Jul</p>
            <p className="font-display text-lg text-paper">{MOCK_HOME_TODAY.length} threads to pull today</p>
            <p className="mt-1 font-mono text-[8px] uppercase tracking-wider text-fog">{MOCK_HOME_STATUS}</p>
          </div>
          <div className="flex gap-1.5 text-[8px]">
            <span className="rounded-full px-2 py-1 text-fog">Docs</span>
            <span className="rounded-full border border-seam px-2 py-1 text-paper">Add manually</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <TodayTile />
          <ConfirmationsTile />
          <SignalsTile />
          <FollowUpsTile />
          <RecentPeopleTile />
          <RecentEventsTile />
        </div>
      </div>
      <CaptureDockPreview />
    </div>
  );
}
