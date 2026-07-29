import { Check } from "lucide-react";

/**
 * The reasoning trace: each arrived step ticks to a check; the last one shows
 * a pulse while its stage is still running (before the answer begins). Steps
 * are code-derived pipeline state, not model output (CLAUDE.md Rule 5).
 */
export function StepChecklist({
  steps,
  pending,
  answered,
}: {
  steps: string[];
  pending: boolean;
  answered: boolean;
}) {
  return (
    <ul className="space-y-1.5">
      {steps.map((step, index) => {
        const inProgress = pending && !answered && index === steps.length - 1;
        return (
          <li key={`${index}-${step}`} className="flex items-center gap-2 text-sm text-fog">
            {inProgress ? (
              <span
                aria-hidden
                className="size-3.5 shrink-0 animate-pulse rounded-full bg-amber/60"
              />
            ) : (
              <Check aria-hidden className="size-3.5 shrink-0 text-ember" />
            )}
            <span>{step}</span>
          </li>
        );
      })}
    </ul>
  );
}
