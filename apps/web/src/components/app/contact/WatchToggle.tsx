"use client";

import { toggleWatchAction } from "@/lib/actions/signals";
import { useOptimisticToggle } from "@/lib/hooks/useOptimisticToggle";
import { Button } from "@/components/ui/button";
import { ComingSoonNotice } from "@/components/app/ComingSoonNotice";
import {
  SIGNAL_WATCH_COMING_SOON,
  SIGNAL_WATCH_DISABLED_DESCRIPTION,
} from "@/utils/constants/coming-soon";
import type { ReactElement } from "react";

/**
 * Opt-in per contact (BRD §6.7): a nightly job web-searches watched
 * contacts and alerts on a job change or notable news. Off by default —
 * never a background lookup the user didn't ask for.
 *
 * The toggle is optimistic — the copy and button flip instantly and revert
 * (with a toast) only if the server rejects it.
 *
 * `searchConfigured` is `hasSearch()` (@dhaga/core), resolved on the server in
 * the person page because it reads `process.env`. False means the nightly job
 * short-circuits on `no_search`, so watching would silently do nothing — the
 * button is disabled and says so rather than taking an opt-in it can't honour.
 * The notice sits BELOW the row, not inside it: it renders a block (control +
 * full-width pill) and would wreck the card's flex row at 375px.
 */
export function WatchToggle({
  contactId,
  watched,
  searchConfigured,
}: {
  contactId: string;
  watched: boolean;
  searchConfigured: boolean;
}): ReactElement {
  const { value: isWatched, pending, set } = useOptimisticToggle({
    value: watched,
    mutate: async (next) => {
      const formData = new FormData();
      formData.set("contactId", contactId);
      formData.set("watch", String(next));
      const result = await toggleWatchAction({ ok: true }, formData);
      if (!result.ok) throw new Error(result.error ?? "Couldn't update watch.");
    },
    errorMessage: "Couldn't update watch — try again.",
  });

  const gate = searchConfigured ? null : SIGNAL_WATCH_COMING_SOON;
  const button = (
    <Button
      type="button"
      className="h-8 px-3 text-xs"
      loading={pending}
      disabled={gate !== null}
      onClick={() => set(!isWatched)}
    >
      {isWatched ? "Stop watching" : "Watch ✦"}
    </Button>
  );

  return (
    <div className="space-y-3 rounded-2xl border border-seam bg-panel p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-paper">Watch for job changes &amp; news</p>
          <p className="text-xs text-fog">
            {gate !== null
              ? SIGNAL_WATCH_DISABLED_DESCRIPTION
              : isWatched
                ? "Watching — a periodic web search checks for a role change or notable news."
                : "Not watching. Opt in to get alerted on a role change or notable public news."}
          </p>
        </div>
        {gate === null ? button : null}
      </div>
      {gate === null ? null : (
        <ComingSoonNotice reason={gate}>{button}</ComingSoonNotice>
      )}
    </div>
  );
}
