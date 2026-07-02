import { deleteFactAction } from "@/lib/actions/notes";
import type { FactWithReceipt } from "@/lib/repo/notes";
import { DeleteButton } from "./DeleteButton";

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
        <li
          key={fact.id}
          className="flex items-start gap-2 rounded-lg border-l-2 border-amber bg-panel px-3 py-2"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-snug text-paper">{fact.text}</p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-fog/60">
              {fact.type}
              {fact.noteCreatedAt
                ? ` · from note, ${fact.noteCreatedAt.toLocaleDateString()}`
                : ""}
            </p>
          </div>
          <form action={deleteFactAction}>
            <input type="hidden" name="factId" value={fact.id} />
            <input type="hidden" name="contactId" value={contactId} />
            <DeleteButton label="Delete fact" />
          </form>
        </li>
      ))}
    </ul>
  );
}
