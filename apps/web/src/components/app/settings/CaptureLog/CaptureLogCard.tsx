import type { ReactElement } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CAPTURE_LOG_PATH, unfinishedBatchesLabel } from "@/utils/constants/capture-log";

/**
 * The capture log's entry point inside Messaging settings. The link is always
 * there — the log is how you reach the audit trail, and a user with a clean
 * history still needs the door.
 *
 * The unfinished-batch line is the opposite: it appears only when there is
 * something stuck, because a permanent "0 unfinished" would be noise on the one
 * state that needs no attention. It is a nudge, not a second log — it says how
 * many and what to do, and sends you to the log for which.
 */
export function CaptureLogCard({
  unfinishedCount,
  unfinishedLimit,
}: {
  /** Batches that never reached a terminal state, capped at `unfinishedLimit`. */
  unfinishedCount: number;
  unfinishedLimit: number;
}): ReactElement {
  return (
    <div className="space-y-3 border-t border-seam pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-paper">Capture log</p>
          <p className="mt-1 text-sm text-fog">
            Every batch you forwarded, and where each message ended up.
          </p>
        </div>
        <Button render={<Link href={CAPTURE_LOG_PATH} />} variant="outline" size="sm">
          Open log
        </Button>
      </div>
      {unfinishedCount > 0 ? (
        <p className="text-sm text-ember">
          {unfinishedBatchesLabel(unfinishedCount, unfinishedLimit)} — reply DONE in the chat
          to save {unfinishedCount === 1 ? "it" : "them"}.
        </p>
      ) : null}
    </div>
  );
}
