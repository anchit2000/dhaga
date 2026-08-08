import { SignalCard } from "../SignalCard";
import type { ReactElement } from "react";
import type { SignalRow } from "@/lib/db/schema";

/**
 * Empty stays SILENT here, in both of the two cases it can mean, and that is
 * a decision rather than an oversight:
 *  - search configured, nothing found yet — a normal state, nothing to say;
 *  - search unconfigured, so nothing is being scanned at all — which the user
 *    IS told, by the "Coming soon" pill on `WatchToggle` directly above this in
 *    the same aside (see the person page). Repeating it here would stack two
 *    explanations of one fact in a ~320px column, and a dashed `EmptyState`
 *    block under a card that just said it is the visual noise CLAUDE.md's UI
 *    rules forbid.
 * If you are here to add an explanation for the unconfigured case, check the
 * WatchToggle notice is still rendered above before you do.
 */
export function ContactSignalList({
  contactId,
  contactName,
  signals,
}: {
  contactId: string;
  contactName: string;
  signals: SignalRow[];
}): ReactElement | null {
  if (signals.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {signals.map((signal) => (
        <SignalCard
          key={signal.id}
          showContact={false}
          signal={{
            id: signal.id,
            contactId,
            contactName,
            kind: signal.kind,
            headline: signal.headline,
            detail: signal.detail,
            sourceUrl: signal.sourceUrl,
          }}
        />
      ))}
    </ul>
  );
}
