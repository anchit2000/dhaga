import type { ReactNode } from "react";
import { MOCK_FEED } from "@/utils/constants/landing";
import { Headshot } from "../Headshot";

export function Feed() {
  return (
    <div className="min-w-0 flex-1 border-r border-seam text-left">
      <div className="flex items-center justify-between border-b border-seam px-4 py-2.5">
        <span className="text-sm font-medium text-paper">Home</span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-ember">
          Today
        </span>
      </div>
      <div className="divide-y divide-seam/60">
        {MOCK_FEED.map((item) => (
          <div
            key={item.text}
            className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-wash/[0.03]"
          >
            {item.personId ? (
              <Headshot personId={item.personId} className="mt-0.5 size-6" />
            ) : (
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-amber/15 text-amber">
                <CalendarIcon />
              </span>
            )}
            <p className="min-w-0 flex-1 text-xs leading-relaxed text-fog">
              {renderBold(item.text, item.bold)}
            </p>
            <span className="shrink-0 font-mono text-[10px] text-fog/60">{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function renderBold(text: string, boldParts: string[]) {
  let segments: ReactNode[] = [text];
  for (const bold of boldParts) {
    const next: ReactNode[] = [];
    for (const segment of segments) {
      if (typeof segment !== "string" || !segment.includes(bold)) {
        next.push(segment);
        continue;
      }
      const [before, ...rest] = segment.split(bold);
      next.push(
        before,
        <span key={bold} className="font-medium text-paper">
          {bold}
        </span>,
        rest.join(bold),
      );
    }
    segments = next;
  }
  return segments;
}
