import type { ReactNode } from "react";
import { ArrowRight, Check } from "lucide-react";

import { EventBadge } from "@/components/app/EventBadge";
import { HOME_TILE_TONE_CLASSES } from "@/utils/constants/home";
import type { HomeTileTone } from "@/utils/constants/home";
import {
  MOCK_HOME_EVENTS,
  MOCK_HOME_FOLLOWUPS,
  MOCK_HOME_PEOPLE,
  MOCK_HOME_TODAY,
} from "@/utils/constants/landing";

export function TodayTile() {
  return (
    <PreviewTile title="Today" meta={`${MOCK_HOME_TODAY.length} people`} accent>
      {MOCK_HOME_TODAY.slice(0, 3).map((person) => (
        <div key={person.personId} className="flex items-center gap-2 border-b border-seam py-1.5 last:border-0">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[9px] font-medium text-paper">{person.name}</p>
            <p className="truncate text-[7px] text-fog"><span className="uppercase text-ember">{person.bucket}</span> · {person.reason}</p>
          </div>
          <span className="rounded-full border border-seam px-1.5 py-0.5 text-[7px] text-fog">Reached out</span>
        </div>
      ))}
      <Footer>+2 more due this week</Footer>
    </PreviewTile>
  );
}

export function FollowUpsTile() {
  return (
    <PreviewTile title="Follow-ups" meta={`${MOCK_HOME_FOLLOWUPS.length} open`} tone="attention">
      {MOCK_HOME_FOLLOWUPS.map((item) => (
        <div key={item.action} className="flex items-start gap-1.5 py-1">
          <span className="flex size-3 shrink-0 items-center justify-center rounded-full border border-seam"><Check className="size-2 text-fog" /></span>
          <p className="text-[8px] leading-snug text-paper">{item.action} <span className="text-human">{item.contact}</span></p>
        </div>
      ))}
      <Footer>View all</Footer>
    </PreviewTile>
  );
}

export function RecentPeopleTile() {
  return (
    <PreviewTile title="Recent people">
      {MOCK_HOME_PEOPLE.map((person) => (
        <div key={person.name} className="flex items-center gap-2 py-1">
          <div className="min-w-0 flex-1"><p className="truncate text-[9px] text-paper">{person.name}</p><p className="truncate text-[7px] text-fog">{person.detail}</p></div>
          <span className="rounded-full border border-seam px-1.5 py-0.5 font-mono text-[6px] uppercase text-fog">{person.reason}</span>
          <ArrowRight className="size-2.5 text-fog" />
        </div>
      ))}
      <Footer>View all people</Footer>
    </PreviewTile>
  );
}

export function RecentEventsTile() {
  return (
    <PreviewTile title="Recent events" tone="network">
      <p className="rounded-full border border-seam px-2 py-1 text-center text-[8px] text-paper">Create event</p>
      {MOCK_HOME_EVENTS.map((event) => (
        <div key={event.name} className="flex items-center gap-2 py-1">
          <EventBadge name={event.name} color="teal" size="sm" className="size-5 text-[9px]" />
          <div className="min-w-0 flex-1"><p className="truncate text-[9px] text-paper">{event.name}</p><p className="text-[7px] text-fog">{event.date}</p></div>
          <span className="text-[7px] text-fog">{event.people} people</span>
        </div>
      ))}
      <Footer>View all events</Footer>
    </PreviewTile>
  );
}

function PreviewTile({
  title,
  meta,
  accent = false,
  tone = "default",
  children,
}: {
  title: string;
  meta?: string;
  accent?: boolean;
  tone?: HomeTileTone;
  children: ReactNode;
}) {
  const toneClass = accent ? HOME_TILE_TONE_CLASSES.amber : HOME_TILE_TONE_CLASSES[tone];
  return (
    <section className={`flex min-w-0 flex-col rounded-lg border bg-panel p-3 ${toneClass}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-paper">{title}</span>
        {meta ? <span className="font-mono text-[7px] uppercase tracking-wider text-fog">{meta}</span> : null}
      </div>
      <div className="mt-2 flex flex-1 flex-col">{children}</div>
    </section>
  );
}

function Footer({ children }: { children: ReactNode }) {
  return <p className="mt-auto border-t border-seam pt-2 text-[8px] text-ember">{children} →</p>;
}
