import { humanizePredicate } from "@dhaga/core";
import {
  confirmEdgeSuggestionAction,
  dismissEdgeSuggestionAction,
} from "@/lib/actions/edge-suggestions";
import type { EdgeSuggestionView } from "@/lib/repo/edge-suggestions";
import { EntityChoices, type NodeTypeOption } from "./EntityChoices";
import { PendingChoice } from "./PendingChoice";

function PersonChoices({ suggestion }: { suggestion: EdgeSuggestionView }) {
  return (
    <div className="flex flex-wrap gap-2">
      {suggestion.candidates.map((candidate) => (
        <form key={candidate.id} action={confirmEdgeSuggestionAction}>
          <input type="hidden" name="suggestionId" value={suggestion.id} />
          <input type="hidden" name="contactId" value={candidate.id} />
          <PendingChoice>
            {candidate.name}
            {candidate.title ? (
              <span className="text-fog"> · {candidate.title}</span>
            ) : null}
          </PendingChoice>
        </form>
      ))}
      <form action={confirmEdgeSuggestionAction}>
        <input type="hidden" name="suggestionId" value={suggestion.id} />
        <PendingChoice variant="ghost">
          + New “{suggestion.objectName}”
        </PendingChoice>
      </form>
      <form action={dismissEdgeSuggestionAction}>
        <input type="hidden" name="suggestionId" value={suggestion.id} />
        <PendingChoice variant="ghost">Dismiss</PendingChoice>
      </form>
    </div>
  );
}

/**
 * "To confirm" inbox: relationships the extractor found but couldn't link
 * unambiguously — a note named someone who matches more than one contact, or
 * a custom entity that's ambiguous or doesn't exist yet. The user picks what
 * is meant — or creates the person/entity — and only then is the edge written
 * into the graph.
 */
export function RelationshipInbox({
  suggestions,
  nodeTypes,
}: {
  suggestions: EdgeSuggestionView[];
  nodeTypes: NodeTypeOption[];
}) {
  if (suggestions.length === 0) return null;
  return (
    <section className="space-y-4 rounded-2xl border border-amber/25 bg-panel p-4 sm:p-5">
      <div>
        <h2 className="font-display text-lg">Relationships to confirm</h2>
        <p className="text-xs leading-relaxed text-fog">
          A note referred to a person or place the extractor couldn&rsquo;t link
          on its own. Pick what it means so the relationship joins the graph.
        </p>
      </div>
      <ul className="space-y-3">
        {suggestions.map((suggestion) => (
          <li
            key={suggestion.id}
            className="space-y-2.5 rounded-xl border border-seam bg-wash/[0.03] p-3"
          >
            <p className="text-sm text-paper">
              <span className="font-medium">{suggestion.srcName}</span>
              <span className="text-fog">
                {" "}
                — {humanizePredicate(suggestion.predicate)} —{" "}
              </span>
              <span className="font-medium">“{suggestion.objectName}”</span>
              {suggestion.objectType === "entity" ? (
                <span className="ml-1.5 rounded-full border border-seam px-2 py-0.5 align-middle font-mono text-[10px] uppercase tracking-wider text-fog">
                  {suggestion.entityTypeHint ?? "entity"}
                </span>
              ) : null}
            </p>
            {suggestion.objectType === "entity" ? (
              <>
                <p className="text-xs text-fog">
                  {suggestion.candidates.length > 0
                    ? `Which “${suggestion.objectName}” do you mean?`
                    : `Nothing named “${suggestion.objectName}” exists yet — create it, or dismiss.`}
                </p>
                <EntityChoices suggestion={suggestion} nodeTypes={nodeTypes} />
              </>
            ) : (
              <>
                <p className="text-xs text-fog">
                  Which “{suggestion.objectName}” do you mean?
                </p>
                <PersonChoices suggestion={suggestion} />
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
