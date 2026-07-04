import { SignalCard } from "../SignalCard";
import type { SignalRow } from "@/lib/db/schema";

export function ContactSignalList({
  contactId,
  contactName,
  signals,
}: {
  contactId: string;
  contactName: string;
  signals: SignalRow[];
}) {
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
