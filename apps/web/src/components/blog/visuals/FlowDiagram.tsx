import { ChevronRight } from "lucide-react";
import { Figure } from "@/components/blog/visuals/Figure";
import type { ReactElement } from "react";

interface FlowStage {
  label: string;
  sub?: string;
}

interface FlowDiagramProps {
  stages: FlowStage[];
  caption?: string;
}

// A staged pipeline: horizontal on sm+, stacked on mobile. Ember chevrons link
// the stages — pointing right when laid out in a row, rotated down when stacked.
export function FlowDiagram({ stages, caption }: FlowDiagramProps): ReactElement {
  return (
    <Figure caption={caption}>
      <ol className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        {stages.map((stage, index) => (
          <li
            key={index}
            className="flex flex-1 flex-col items-stretch gap-2 sm:flex-row sm:items-center"
          >
            <div className="flex-1 rounded-lg border border-seam bg-panel-2 px-4 py-3 text-center sm:text-left">
              <div className="font-medium text-paper">{stage.label}</div>
              {stage.sub ? (
                <div className="mt-0.5 text-xs text-fog">{stage.sub}</div>
              ) : null}
            </div>
            {index < stages.length - 1 ? (
              <ChevronRight
                aria-hidden="true"
                className="mx-auto size-5 shrink-0 rotate-90 text-ember sm:mx-0 sm:rotate-0"
              />
            ) : null}
          </li>
        ))}
      </ol>
    </Figure>
  );
}
