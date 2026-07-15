"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { StitchLoader } from "@/components/brand/StitchLoader";
import { LOADER_MESSAGE_INTERVAL_MS } from "@/utils/constants/loader-messages";

/** Advances through `messages` on an interval, then holds on the last line. */
function useCyclingStatus(messages: readonly string[], intervalMs: number): string {
  const [index, setIndex] = useState(0);
  const [prevMessages, setPrevMessages] = useState(messages);

  // Reset to the first line when the message set swaps. Doing this during
  // render (not in the effect) is React's documented alternative to calling
  // setState synchronously inside an effect.
  if (messages !== prevMessages) {
    setPrevMessages(messages);
    setIndex(0);
  }

  useEffect(() => {
    if (messages.length <= 1) return;
    const timer = setInterval(() => {
      // Hold on the final line instead of looping — a loop reads as "stuck".
      setIndex((current) => (current < messages.length - 1 ? current + 1 : current));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [messages, intervalMs]);

  return messages[index] ?? messages[0] ?? "";
}

interface ThreadLoaderProps {
  messages: readonly string[];
  className?: string;
  intervalMs?: number;
  /** Render as a centered overlay filling the nearest positioned parent. */
  overlay?: boolean;
}

/**
 * Brand-native loader for waits that outlast a click: the stitch mark plus
 * status copy that advances through `messages`. The StitchLoader carries the
 * screen-reader announcement; the visible line is decorative (aria-hidden).
 */
export function ThreadLoader({
  messages,
  className,
  intervalMs = LOADER_MESSAGE_INTERVAL_MS,
  overlay = false,
}: ThreadLoaderProps): React.ReactElement {
  const message = useCyclingStatus(messages, intervalMs);

  const content = (
    <span className={cn("inline-flex items-center gap-2.5 text-sm text-fog", !overlay && className)}>
      <StitchLoader label={message} />
      <span key={message} aria-hidden className="animate-in fade-in-0 duration-500">
        {message}
      </span>
    </span>
  );

  if (!overlay) return content;

  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-ink/60 backdrop-blur-sm",
        className,
      )}
    >
      {content}
    </div>
  );
}
