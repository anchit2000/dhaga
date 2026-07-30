"use client";

import { createPortal } from "react-dom";
import { ThreadLoader } from "@/components/brand/ThreadLoader";
import { cn } from "@/lib/utils";

/**
 * The branded "extraction in flight" scrim — one for every capture surface
 * (in-dialog, standalone form, and the dock's own scan with the dialog closed).
 *
 * Portalled to <body> and fixed to the VIEWPORT, above the capture Dialog's
 * z-50. Rendered as a child of the dialog instead, its `fixed` resolved against
 * the dialog's own transform, which inside that `overflow-y-auto` box behaves
 * like `absolute` — so with a loaded image tray the scrim sat above the scroll
 * position and the scan looked like nothing was happening.
 */
export function CaptureLoader({
  messages,
  className,
}: {
  messages: readonly string[];
  className?: string;
}) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <ThreadLoader
      overlay
      className={cn("fixed z-[60] rounded-none bg-ink/80", className)}
      messages={messages}
    />,
    document.body,
  );
}
