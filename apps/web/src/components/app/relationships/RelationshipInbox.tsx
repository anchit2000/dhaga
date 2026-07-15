import { humanizePredicate } from "@dhaga/core";
import {
  confirmEdgeSuggestionAction,
  dismissEdgeSuggestionAction,
} from "@/lib/actions/edge-suggestions";
import type { EdgeSuggestionView } from "@/lib/repo/edge-suggestions";
import { PendingChoice } from "./PendingChoice";

/**
 * "To confirm" inbox: relationships the extractor found but couldn't link
 * unambiguously (the note named someone who matches more than one contact, or
 * only fuzzily). The user picks who is meant — or creates a new person — and
 * only then is the edge written into the graph.
 */
export function RelationshipInbox({
  suggestions,
}: {
  suggestions: EdgeSuggestionView[];
}) {
  if (suggestions.length === 0) return null;
  return (
    <section className="space-y-4 rounded-2xl border border-amber/25 bg-panel p-4 sm:p-5">
      <div>
        <h2 className="font-display text-lg">Relationships to confirm</h2>
        <p className="text-xs leading-relaxed text-fog">
          A note referred to someone who matches more than one contact. Pick who
          it means so the relationship joins the graph.
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
            </p>
            <p className="text-xs text-fog">
              Which “{suggestion.objectName}” do you mean?
            </p>
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
          </li>
        ))}
      </ul>
    </section>
  );
}
