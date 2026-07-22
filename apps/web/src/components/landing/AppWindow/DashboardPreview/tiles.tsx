import { Check } from "lucide-react";
import {
  MOCK_HOME_FOLLOWUPS,
  MOCK_HOME_PEOPLE,
  MOCK_HOME_TODAY,
} from "@/utils/constants/landing";
import { Headshot } from "../../Headshot";

/**
 * The hero shot's core list tiles (Today, Follow-ups, Recent people), kept in
 * the miniature type scale (text-[7px]/[8px]/[9px]) and tokens (border-seam,
 * bg-panel, text-paper/fog, ember/amber accents) the shot already uses.
 * The proactive-intelligence tiles live in ./intelligence; mock data lives in
 * utils/constants/landing/appmock.ts.
 */

/** Hero tile: the curated reach-out list for today. */
export function TodayTile() {
  return (
    <section className="col-span-2 row-span-2 rounded-lg border border-amber/25 bg-panel bg-gradient-to-br from-amber/[0.06] to-transparent p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-paper">Today</span>
        <span className="font-mono text-[8px] uppercase tracking-widest text-fog">{MOCK_HOME_TODAY.length} people</span>
      </div>
      <div className="mt-2 divide-y divide-seam">
        {MOCK_HOME_TODAY.map((person) => (
          <div key={person.personId} className="flex items-center gap-2 py-2 first:pt-0 last:pb-0">
            <Headshot personId={person.personId} className="size-5" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[9px] text-paper">{person.name}</p>
              <p className="truncate text-[8px] text-fog">
                <span className="font-mono uppercase tracking-wider text-ember">{person.bucket}</span> · {person.reason}
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-seam px-1.5 py-0.5 text-[7px] text-fog">Reached out</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Note-derived follow-ups to close. */
export function FollowUpsTile() {
  return (
    <section className="rounded-lg border border-seam bg-panel p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-paper">Follow-ups</span>
        <span className="font-mono text-[8px] uppercase tracking-widest text-fog">{MOCK_HOME_FOLLOWUPS.length} open</span>
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
  );
}

/** Most recently captured people. */
export function RecentPeopleTile() {
  return (
    <section className="col-span-2 rounded-lg border border-seam bg-panel p-3">
      <p className="text-xs font-medium text-paper">Recent people</p>
      <div className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1.5">
        {MOCK_HOME_PEOPLE.map((person) => (
          <div key={person.name} className="min-w-0">
            <p className="truncate text-[9px] text-paper">{person.name}</p>
            <p className="truncate text-[8px] text-fog">{person.detail}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[9px] text-ember">View all people</p>
    </section>
  );
}
