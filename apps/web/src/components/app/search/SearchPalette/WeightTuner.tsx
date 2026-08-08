import { Slider } from "@/components/ui/slider";
import { ComingSoonNotice } from "@/components/app/ComingSoonNotice";
import { SEMANTIC_SEARCH_COMING_SOON } from "@/utils/constants/coming-soon";
import {
  DEFAULT_SEARCH_WEIGHTS,
  SEARCH_WEIGHT_FIELDS,
  SEARCH_WEIGHT_MAX,
  SEARCH_WEIGHT_MIN,
  type SearchWeights,
} from "@/utils/constants/search";

/**
 * Each slider is fully independent — dragging one never changes another's
 * value. What's "live" is the search results below, which re-rank as any
 * slider moves (SearchPalette debounces + re-runs the query on `weights`
 * changes the same way it does on typed-text changes).
 *
 * One exception: with embeddings switched off on the instance the semantic
 * source returns nothing, so weighting it re-ranks an empty set. That single
 * slider is disabled and labelled coming-soon; the rest stay live.
 */
export function WeightTuner({
  weights,
  onChange,
  onCommit,
  semanticEnabled,
}: {
  weights: SearchWeights;
  onChange: (weights: SearchWeights) => void;
  onCommit: (weights: SearchWeights) => void;
  /** `embeddingsEnabled()` as resolved server-side by searchAction. */
  semanticEnabled: boolean;
}) {
  return (
    <div className="space-y-3 border-b border-seam bg-panel-2/40 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-fog">Tune ranking</p>
        <button
          type="button"
          onClick={() => onCommit(DEFAULT_SEARCH_WEIGHTS)}
          className="text-xs text-fog underline-offset-2 hover:text-paper hover:underline"
        >
          Reset
        </button>
      </div>
      <div className="space-y-2.5">
        {SEARCH_WEIGHT_FIELDS.map((field) => {
          const gate =
            field.key === "semantic" && !semanticEnabled ? SEMANTIC_SEARCH_COMING_SOON : null;
          return (
            // Wraps the WHOLE row, not the slider: ComingSoonNotice stacks its
            // pill beneath its child, so anchoring it to the slider alone would
            // wedge the explanation into the middle column. Around the row it
            // spans the panel and stays readable at 375px.
            <ComingSoonNotice key={field.key} reason={gate}>
              <div className="flex items-center gap-3">
                <span className="w-40 shrink-0 text-xs text-fog">{field.label}</span>
                <Slider
                  min={SEARCH_WEIGHT_MIN}
                  max={SEARCH_WEIGHT_MAX}
                  step={1}
                  value={weights[field.key]}
                  disabled={gate !== null}
                  onValueChange={(value) => onChange({ ...weights, [field.key]: value })}
                  onValueCommitted={(value) => onCommit({ ...weights, [field.key]: value })}
                />
                <span className="w-5 shrink-0 text-right font-mono text-xs text-fog">
                  {weights[field.key]}
                </span>
              </div>
            </ComingSoonNotice>
          );
        })}
      </div>
    </div>
  );
}
