"use client";

import { toggleWatchAction } from "@/lib/actions/signals";
import { useOptimisticToggle } from "@/lib/hooks/useOptimisticToggle";
import { Button } from "@/components/ui/button";

/**
 * Opt-in per contact (BRD §6.7): a nightly job web-searches watched
 * contacts and alerts on a job change or notable news. Off by default —
 * never a background lookup the user didn't ask for.
 *
 * The toggle is optimistic — the copy and button flip instantly and revert
 * (with a toast) only if the server rejects it.
 */
export function WatchToggle({
  contactId,
  watched,
}: {
  contactId: string;
  watched: boolean;
}) {
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

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-seam bg-panel p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-paper">Watch for job changes & news</p>
        <p className="text-xs text-fog">
          {isWatched
            ? "Watching — a periodic web search checks for a role change or notable news."
            : "Not watching. Opt in to get alerted on a role change or notable public news."}
        </p>
      </div>
      <Button
        type="button"
        className="h-8 px-3 text-xs"
        loading={pending}
        onClick={() => set(!isWatched)}
      >
        {isWatched ? "Stop watching" : "Watch ✦"}
      </Button>
    </div>
  );
}
