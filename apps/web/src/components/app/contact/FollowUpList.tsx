import { completeFollowUpAction } from "@/lib/actions/notes";
import type { FollowUpRow } from "@/lib/db/schema";
import { Check } from "lucide-react";

export function FollowUpList({
  contactId,
  followUps,
}: {
  contactId: string;
  followUps: FollowUpRow[];
}) {
  if (followUps.length === 0) return null;
  return (
    <div>
      <h2 className="mb-2 font-display text-lg">Follow-ups</h2>
      <ul className="space-y-1.5">
        {followUps.map((followUp) => (
          <li
            key={followUp.id}
            className="flex items-center gap-2.5 rounded-lg border border-seam bg-panel px-3 py-2"
          >
            <form action={completeFollowUpAction} className="shrink-0">
              <input type="hidden" name="followUpId" value={followUp.id} />
              <input type="hidden" name="contactId" value={contactId} />
              <button
                type="submit"
                aria-label="Mark done"
                title="Mark done"
                className="flex size-5 items-center justify-center rounded-full border border-amber/50 text-ember transition-colors hover:bg-amber/15"
              >
                <Check className="size-3" />
              </button>
            </form>
            <p className="min-w-0 flex-1 text-sm text-paper">
              {followUp.action}
              {followUp.dueHint ? (
                <span className="text-fog"> — {followUp.dueHint}</span>
              ) : null}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
