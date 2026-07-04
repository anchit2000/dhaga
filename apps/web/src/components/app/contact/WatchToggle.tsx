"use client";

import { useActionState } from "react";
import { toggleWatchAction } from "@/lib/actions/signals";
import type { ToggleWatchResult } from "@/lib/repo/signals";
import { SubmitButton } from "../SubmitButton";

/**
 * Opt-in per contact (BRD §6.7): a nightly job web-searches watched
 * contacts and alerts on a job change or notable news. Off by default —
 * never a background lookup the user didn't ask for.
 */
export function WatchToggle({
  contactId,
  watched,
}: {
  contactId: string;
  watched: boolean;
}) {
  const [state, formAction] = useActionState<ToggleWatchResult, FormData>(
    toggleWatchAction,
    { ok: true },
  );

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-seam bg-panel p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-paper">Watch for job changes & news</p>
        <p className="text-xs text-fog">
          {watched
            ? "Watching — a periodic web search checks for a role change or notable news."
            : "Not watching. Opt in to get alerted on a role change or notable public news."}
        </p>
      </div>
      <form action={formAction}>
        <input type="hidden" name="contactId" value={contactId} />
        <input type="hidden" name="watch" value={(!watched).toString()} />
        <SubmitButton className="h-8 px-3 text-xs">
          {watched ? "Stop watching" : "Watch ✦"}
        </SubmitButton>
      </form>
      {state.error ? (
        <p className="w-full text-xs text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
