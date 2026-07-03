import type { FactWithReceipt } from "@/lib/repo/notes";
import { FactItem } from "./FactItem";

/** AI-derived facts, each with its receipt (the note it came from). */
export function FactList({
  contactId,
  facts,
}: {
  contactId: string;
  facts: FactWithReceipt[];
}) {
  if (facts.length === 0) {
    return (
      <p className="text-sm text-fog">
        No facts yet — add a note below and they get extracted automatically.
      </p>
    );
  }
  return (
    <ul className="space-y-1.5">
      {facts.map((fact) => (
        <FactItem
          key={fact.id}
          contactId={contactId}
          factId={fact.id}
          text={fact.text}
          type={fact.type}
          receipt={
            fact.noteCreatedAt
              ? `from note, ${fact.noteCreatedAt.toLocaleDateString()}`
              : null
          }
        />
      ))}
    </ul>
  );
}
