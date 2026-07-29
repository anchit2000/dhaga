"use client";

import { ThreadLoader } from "@/components/brand/ThreadLoader";
import { cn } from "@/lib/utils";

/**
 * The branded "extraction in flight" scrim, shared by the two capture surfaces
 * (in-dialog / standalone form, and the dock's own scan with the dialog closed).
 *
 * `fixed`, not `absolute`: inside the capture Dialog its transform makes it the
 * containing block, so the scrim covers the dialog's visible box and the loader
 * stays centred there. An absolute overlay centred itself in the FULL form
 * height, which with a loaded image tray scrolls out of view — the scan then
 * looked like nothing was happening. Outside the dialog it covers the viewport,
 * which is the same intent.
 */
export function CaptureLoader({
  messages,
  className,
}: {
  messages: readonly string[];
  className?: string;
}) {
  return (
    <ThreadLoader
      overlay
      className={cn("fixed z-50 rounded-xl bg-ink/80", className)}
      messages={messages}
    />
  );
}
