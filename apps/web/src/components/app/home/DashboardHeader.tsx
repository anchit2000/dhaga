import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDayline } from "@/utils/format-date";
import type { ReactElement } from "react";

interface DashboardHeaderProps {
  now: Date;
  peopleCount: number;
  suggestionCount: number;
  openFollowUpCount: number;
  signalCount: number;
  quietCount: number;
}

/**
 * Home's daily-briefing header. Split out of DashboardSection per the 150-line
 * rule: DashboardSection owns the queries, this owns how the day is worded.
 * Takes counts rather than the rows themselves — the headline and status line
 * are the only things on this page that care purely about volume.
 */
export function DashboardHeader({
  now,
  peopleCount,
  suggestionCount,
  openFollowUpCount,
  signalCount,
  quietCount,
}: DashboardHeaderProps): ReactElement {
  // Daily-briefing headline: Home greets you with your day, built from data
  // already on this page — never a bare "Home" label.
  const headline =
    peopleCount === 0
      ? "Thread your first contact"
      : suggestionCount > 0
        ? `${suggestionCount} ${suggestionCount === 1 ? "thread" : "threads"} to pull today`
        : openFollowUpCount > 0
          ? `${openFollowUpCount} open follow-up${openFollowUpCount === 1 ? "" : "s"} to close`
          : "All caught up";
  const statusParts = [
    suggestionCount > 0 ? `${suggestionCount} due` : null,
    openFollowUpCount > 0 ? `${openFollowUpCount} follow-up${openFollowUpCount === 1 ? "" : "s"}` : null,
    signalCount > 0 ? `${signalCount} signal${signalCount === 1 ? "" : "s"}` : null,
    quietCount > 0 ? `${quietCount} going quiet` : null,
  ].filter((part): part is string => part !== null);

  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-ember">{formatDayline(now)}</p>
        <h1 className="mt-1 font-display text-2xl tracking-tight">{headline}</h1>
        {statusParts.length > 0 ? <p className="mt-1.5 font-mono text-[11px] uppercase tracking-wider text-fog">{statusParts.join(" · ")}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        <Button render={<Link href="/docs" />} variant="ghost" size="sm">Docs</Button>
        <Button render={<Link href="/app/people/new" />} variant="outline" size="sm">Add manually</Button>
      </div>
    </div>
  );
}
