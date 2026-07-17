"use client";

import { HomeTile } from "./HomeTile";
import { SignalCard } from "../SignalCard";
import { SIGNALS_FEED_LIMIT } from "@/utils/constants/app";
import type { SignalItem } from "@/lib/repo/signals";

/** New job-change/news alerts across the graph (BRD §6.7), newest first. */
export function SignalsFeed({
  signals,
  onSelectContact,
}: {
  signals: SignalItem[];
  onSelectContact: (id: string) => void;
}) {
  if (signals.length === 0) return null;
  const shown = signals.slice(0, SIGNALS_FEED_LIMIT);
  const overflow = signals.length - shown.length;

  return (
    <HomeTile
      title="Signals"
      meta={
        <span className="font-mono text-[10px] uppercase tracking-widest text-fog">
          {signals.length} new
        </span>
      }
    >
      <ul className="space-y-1.5">
        {shown.map((signal) => (
          <SignalCard key={signal.id} showContact signal={signal} onContactClick={onSelectContact} />
        ))}
      </ul>
      {overflow > 0 ? <p className="mt-auto pt-1 text-xs text-fog">+{overflow} more signals</p> : null}
    </HomeTile>
  );
}
