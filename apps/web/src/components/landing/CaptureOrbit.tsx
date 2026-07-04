import type { ReactNode } from "react";
import { ThreadMark } from "@/components/brand/ThreadMark";

interface OrbitItem {
  label: string;
  radius: number;
  duration: number;
  angle: number;
  icon: ReactNode;
}

const ITEMS: OrbitItem[] = [
  { label: "Card scan", radius: 92, duration: 16, angle: 15, icon: <CardGlyph /> },
  { label: "Badge / QR", radius: 92, duration: 16, angle: 165, icon: <QrGlyph /> },
  { label: "Voice note", radius: 130, duration: 24, angle: 255, icon: <MicGlyph /> },
  { label: "LinkedIn", radius: 130, duration: 24, angle: 80, icon: <LinkGlyph /> },
];

/**
 * The capture sources — card, badge/QR, voice, LinkedIn — orbiting the
 * Dhaga mark, echoing the "capture anywhere" pitch instead of generic
 * social-app logos. Purely decorative: hidden under reduced motion rather
 * than frozen mid-orbit.
 */
export function CaptureOrbit() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 hidden items-center justify-center motion-reduce:hidden md:flex"
    >
      <div className="relative size-[300px]">
        <span className="absolute inset-[54px] rounded-full border border-dashed border-amber/15" />
        <span className="absolute inset-0 rounded-full border border-dashed border-amber/10" />

        <span className="absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-amber/40 bg-panel shadow-[0_0_30px_-4px_rgba(226,164,76,0.6)]">
          <ThreadMark size={22} />
        </span>

        {ITEMS.map((item) => (
          // Each level owns exactly one transform: outer sets the static
          // starting angle, middle spins continuously, inner div is placed
          // at `radius` along that rotated axis (via margin, not transform,
          // so it's free to run its own counter-rotation without clobbering
          // the placement).
          <div
            key={item.label}
            className="absolute inset-0"
            style={{ transform: `rotate(${item.angle}deg)` }}
          >
            <div
              className="absolute inset-0"
              style={{ animation: `dhaga-orbit-spin ${item.duration}s linear infinite` }}
            >
              <div
                className="absolute left-1/2 top-1/2"
                style={{ transform: `translateX(${item.radius}px)` }}
              >
                <div
                  className="flex size-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-amber shadow-[0_0_14px_-4px_rgba(226,164,76,0.45)] backdrop-blur-md"
                  style={{
                    animation: `dhaga-orbit-counter ${item.duration}s linear infinite`,
                    marginLeft: -18,
                    marginTop: -18,
                  }}
                >
                  {item.icon}
                  <span className="sr-only">{item.label}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CardGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
      <path d="M2.5 9.5h19M6 14h4" />
    </svg>
  );
}

function QrGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20v.01" strokeLinecap="round" />
    </svg>
  );
}

function MicGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2.5" width="6" height="12" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5v4M8.5 21.5h7" />
    </svg>
  );
}

function LinkGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M7.5 10v7M7.5 7.2v.1M11.5 17v-4.5c0-1.4 1.1-2.5 2.5-2.5s2.5 1.1 2.5 2.5V17" />
    </svg>
  );
}
