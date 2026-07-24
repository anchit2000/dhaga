import { FACT_TYPES } from "@dhaga/core";
import type { FactWithReceipt } from "@/lib/repo/notes";
import { FactItem } from "./FactItem";
import { AddFactForm } from "./AddFactForm";

/** AI-derived facts, each with its receipt (the note it came from) — plus a
 *  manual "Add fact" path so the graph is usable without any extraction. */
export function FactList({
  contactId,
  facts,
}: {
  contactId: string;
  facts: FactWithReceipt[];
}) {
  return (
    <div className="space-y-2.5">
      {facts.length === 0 ? (
        <p className="text-sm text-fog">
          No facts yet — jot one down below, or add a note and they get extracted automatically.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {facts.map((fact) => (
            <FactItem
              key={fact.id}
              contactId={contactId}
              factId={fact.id}
              text={fact.text}
              type={fact.type}
              unverified={fact.unverified}
              receipt={
                fact.noteCreatedAt
                  ? `from note, ${fact.noteCreatedAt.toLocaleDateString()}`
                  : null
              }
            />
          ))}
        </ul>
      )}
      <AddFactForm contactId={contactId} factTypes={FACT_TYPES} />
    </div>
  );
}
