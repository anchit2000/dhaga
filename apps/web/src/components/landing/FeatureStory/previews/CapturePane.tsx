import { Camera, Crop, Mic, Upload, UserPlus } from "lucide-react";
import type { ReactElement } from "react";

import { CAPTURE_PREVIEW } from "./fixtures";

const DOCK_ICONS = { Voice: Mic, Camera, Upload, Capture: UserPlus } as const;

export function CapturePane(): ReactElement {
  return (
    <div className="flex min-w-0 flex-1 flex-col p-4">
      <div className="rounded-xl border border-seam bg-panel p-4 shadow-lg">
        <p className="font-display text-base text-paper">Capture someone</p>
        <p className="mt-1 text-[11px] leading-5 text-fog">
          Paste an intro, speak a note, or scan a card. Dhaga keeps the source as a receipt.
        </p>
        <div className="mt-3 flex gap-1.5">
          {CAPTURE_PREVIEW.modes.map((mode) => (
            <span
              key={mode}
              className={`rounded-full border px-3 py-1 text-[10px] ${
                mode === "Card photo"
                  ? "border-amber/40 bg-amber/15 font-medium text-ember"
                  : "border-seam text-fog"
              }`}
            >
              {mode}
            </span>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-seam bg-well p-2.5">
          <div className="flex h-14 w-20 items-center justify-center rounded-lg border border-seam bg-panel-2">
            <span className="font-display text-[9px] text-paper">MERIDIAN</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-paper">1 image of this card</p>
            <p className="truncate text-[10px] text-fog">{CAPTURE_PREVIEW.file}</p>
          </div>
          <span className="flex size-8 items-center justify-center rounded-full border border-seam text-fog">
            <Crop className="size-3.5" aria-hidden />
          </span>
        </div>
        <div className="mt-3 rounded-full bg-gradient-to-b from-amber-lift to-amber-sink py-2 text-center text-xs font-semibold text-on-accent">
          Scan card
        </div>
      </div>
      <div className="mx-auto mt-3 flex gap-1 rounded-2xl border border-seam bg-panel-2 p-1.5">
        {CAPTURE_PREVIEW.dock.map((label) => {
          const Icon = DOCK_ICONS[label];
          return (
            <span key={label} className="flex min-w-11 flex-col items-center gap-0.5 text-[7px] text-fog">
              <span className="flex size-7 items-center justify-center rounded-full border border-seam">
                <Icon className="size-3" aria-hidden />
              </span>
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
