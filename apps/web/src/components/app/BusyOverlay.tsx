"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ThreadLoader } from "@/components/brand/ThreadLoader";
import { BUSY_OVERLAY_MAX_MS } from "@/utils/constants/loader-messages";

interface BusyOverlayValue {
  /** Show the blocking scrim with this status copy. Call it from the click
   *  handler, BEFORE dispatching the action — see the note below on why. */
  showBusy: (messages: readonly string[]) => void;
  hideBusy: () => void;
}

const BusyOverlayContext = createContext<BusyOverlayValue>({
  showBusy: () => {},
  hideBusy: () => {},
});

export function useBusyOverlay(): BusyOverlayValue {
  return useContext(BusyOverlayContext);
}

/**
 * The app shell's blocking "work in flight" scrim, for waits a page's own
 * in-place spinner cannot cover.
 *
 * WHY IT LIVES IN THE LAYOUT, not next to the form it belongs to: a Server
 * Action's response re-renders the page tree, so an async segment in its own
 * <Suspense> (home's `<Suspense fallback={null}><HomeDock/>`) RE-SUSPENDS for
 * the whole call. React hides that boundary's committed DOM with
 * `display: none` — portals included — and the `pending` render never commits,
 * because it is queued behind the same suspended transition. A card scan
 * therefore blanked the capture dialog and showed nothing at all until the
 * result arrived. Anything rendered inside the boundary has this problem; the
 * app shell sits above every page Suspense, so its state paints immediately.
 *
 * Corollary for callers: `showBusy` must run as an URGENT update — call it in
 * the event handler before the action dispatch, never inside the transition or
 * from an effect that depends on the action's `pending` flag, which cannot
 * commit while the boundary is suspended.
 */
export function BusyOverlayProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<readonly string[] | null>(null);

  const showBusy = useCallback((next: readonly string[]) => setMessages(next), []);
  const hideBusy = useCallback(() => setMessages(null), []);
  const value = useMemo(() => ({ showBusy, hideBusy }), [showBusy, hideBusy]);

  // This scrim blocks the whole app, so it must never be able to outlive the
  // work it reports on — a lost "done" would otherwise freeze the UI for good.
  useEffect(() => {
    if (!messages) return;
    const timer = setTimeout(() => setMessages(null), BUSY_OVERLAY_MAX_MS);
    return () => clearTimeout(timer);
  }, [messages]);

  return (
    <BusyOverlayContext value={value}>
      {children}
      {messages ? (
        <ThreadLoader
          overlay
          // Blocks the whole viewport: above the dialogs it covers (z-50) so a
          // capture in flight cannot be clicked through or dismissed.
          className="fixed z-[60] rounded-none bg-ink/80"
          messages={messages}
        />
      ) : null}
    </BusyOverlayContext>
  );
}
