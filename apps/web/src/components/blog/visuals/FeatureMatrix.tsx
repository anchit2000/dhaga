import { Check } from "lucide-react";
import { Figure } from "@/components/blog/visuals/Figure";
import type { CSSProperties, ReactElement } from "react";

interface FeatureMatrixRow {
  feature: string;
  values: (boolean | string)[];
}

interface FeatureMatrixProps {
  columns: string[];
  rows: FeatureMatrixRow[];
  highlightColumn?: number;
  caption?: string;
}

// Amber wash + ember top accent for the highlighted (Dhaga) column. The wash is
// a fill so it stays amber; the 2px accent is a thin rule, and amber is only
// 2.0:1 on the light panel, so it uses ember (crisp in both themes).
const HIGHLIGHT_BG: CSSProperties = {
  backgroundColor: "color-mix(in srgb, var(--color-amber) 9%, transparent)",
};
// The top accent lives in inline style (not a Tailwind per-side border utility)
// so an unhighlighted header keeps a matching transparent 2px rail and the row
// heights stay aligned, with no border-color cascade ambiguity.
const HEAD_BASE: CSSProperties = { borderTop: "2px solid transparent" };
const HIGHLIGHT_HEAD: CSSProperties = {
  ...HIGHLIGHT_BG,
  borderTop: "2px solid var(--color-ember)",
};

function renderValue(value: boolean | string): ReactElement {
  if (typeof value === "string") {
    return <span className="text-paper">{value}</span>;
  }
  if (value) {
    return <Check className="mx-auto size-4 text-ember" role="img" aria-label="Yes" />;
  }
  return (
    <span className="text-fog" role="img" aria-label="No">
      &mdash;
    </span>
  );
}

// A responsive comparison grid. The highlighted column (Dhaga's) gets an amber
// wash and an ember top accent; booleans render as an ember check or fog dash.
export function FeatureMatrix({
  columns,
  rows,
  highlightColumn,
  caption,
}: FeatureMatrixProps): ReactElement {
  return (
    <Figure caption={caption}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {columns.map((column, index) => {
                const highlighted = index === highlightColumn;
                return (
                  <th
                    key={index}
                    scope="col"
                    className={`border-b-2 border-seam px-3 py-2.5 font-mono text-xs uppercase tracking-wider ${
                      index === 0 ? "text-left text-fog" : "text-center text-paper"
                    }`}
                    style={highlighted ? HIGHLIGHT_HEAD : HEAD_BASE}
                  >
                    {column}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <th
                  scope="row"
                  className="border-b border-seam px-3 py-2.5 text-left font-normal text-paper"
                >
                  {row.feature}
                </th>
                {row.values.map((value, valueIndex) => {
                  const highlighted = valueIndex + 1 === highlightColumn;
                  return (
                    <td
                      key={valueIndex}
                      className="border-b border-seam px-3 py-2.5 text-center"
                      style={highlighted ? HIGHLIGHT_BG : undefined}
                    >
                      {renderValue(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Figure>
  );
}
