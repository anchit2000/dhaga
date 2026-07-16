import {
  confirmEdgeSuggestionAction,
  dismissEdgeSuggestionAction,
} from "@/lib/actions/edge-suggestions";
import { Select } from "@/components/ui/select";
import { PendingChoice } from "./PendingChoice";
import type { EdgeSuggestionView } from "@/lib/repo/edge-suggestions";

export interface NodeTypeOption {
  id: string;
  name: string;
  slug: string;
}

/** Preselect the node type the extractor guessed (hint is a slug, but match
 *  names too so a hint like "Gym" still lands). */
function hintedTypeId(
  hint: string | null,
  nodeTypes: NodeTypeOption[],
): string | undefined {
  if (!hint) return undefined;
  const lower = hint.trim().toLowerCase();
  return nodeTypes.find(
    (type) => type.slug === lower || type.name.toLowerCase() === lower,
  )?.id;
}

/**
 * Confirm choices for an entity suggestion: link one of the matching entities,
 * create a new entity of a user-picked node type, or dismiss. The create path
 * is omitted when the user has no node types yet — an entity cannot exist
 * without one.
 */
export function EntityChoices({
  suggestion,
  nodeTypes,
}: {
  suggestion: EdgeSuggestionView;
  nodeTypes: NodeTypeOption[];
}) {
  const defaultTypeId = hintedTypeId(suggestion.entityTypeHint, nodeTypes) ?? nodeTypes[0]?.id;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {suggestion.candidates.map((candidate) => (
        <form key={candidate.id} action={confirmEdgeSuggestionAction}>
          <input type="hidden" name="suggestionId" value={suggestion.id} />
          <input type="hidden" name="entityId" value={candidate.id} />
          <PendingChoice>
            {candidate.name}
            {candidate.title ? (
              <span className="text-fog"> · {candidate.title}</span>
            ) : null}
          </PendingChoice>
        </form>
      ))}
      {nodeTypes.length > 0 ? (
        <form
          action={confirmEdgeSuggestionAction}
          className="flex flex-wrap items-center gap-2"
        >
          <input type="hidden" name="suggestionId" value={suggestion.id} />
          <Select
            name="nodeTypeId"
            defaultValue={defaultTypeId}
            aria-label="Type for the new entity"
            className="h-8 w-auto min-w-24 rounded-full px-3 text-xs md:text-xs"
          >
            {nodeTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </Select>
          <PendingChoice variant="ghost">
            + New “{suggestion.objectName}”
          </PendingChoice>
        </form>
      ) : null}
      <form action={dismissEdgeSuggestionAction}>
        <input type="hidden" name="suggestionId" value={suggestion.id} />
        <PendingChoice variant="ghost">Dismiss</PendingChoice>
      </form>
    </div>
  );
}
