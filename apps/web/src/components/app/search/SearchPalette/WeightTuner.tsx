import { Slider } from "@/components/ui/slider";
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
 */
export function WeightTuner({
  weights,
  onChange,
  onCommit,
}: {
  weights: SearchWeights;
  onChange: (weights: SearchWeights) => void;
  onCommit: (weights: SearchWeights) => void;
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
        {SEARCH_WEIGHT_FIELDS.map((field) => (
          <div key={field.key} className="flex items-center gap-3">
            <span className="w-40 shrink-0 text-xs text-fog">{field.label}</span>
            <Slider
              min={SEARCH_WEIGHT_MIN}
              max={SEARCH_WEIGHT_MAX}
              step={1}
              value={weights[field.key]}
              onValueChange={(value) => onChange({ ...weights, [field.key]: value })}
              onValueCommitted={(value) => onCommit({ ...weights, [field.key]: value })}
            />
            <span className="w-5 shrink-0 text-right font-mono text-xs text-fog">
              {weights[field.key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
