import type { ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { AiGateNotice } from "@/components/app/AiGateNotice";

/**
 * The Search tab's right rail on wide screens: keyword results are just
 * matches, so this turns the current query into an Ask-Dhaga question for a
 * reasoned answer with receipts. Hidden below `lg` — a single bridge action
 * isn't worth a stacked mobile row (PaletteBody hides it there).
 */
export function SearchAskBridge({
  query,
  onAsk,
  aiGate,
}: {
  query: string;
  onAsk: (question: string) => void;
  /** Why Ask Dhaga is greyed out (no AI credits left), or null. The keyword
   *  results this rail sits beside are unaffected. */
  aiGate: string | null;
}): ReactElement {
  return (
    <div className="space-y-3 rounded-2xl border border-amber/25 bg-amber/[0.05] p-4">
      <p className="text-sm text-fog">
        Not just matches — get a reasoned answer with receipts for this search.
      </p>
      <Button
        type="button"
        onClick={() => onAsk(query)}
        disabled={query.trim().length === 0 || aiGate !== null}
        className="h-9 w-full px-4 text-sm"
      >
        Ask Dhaga ✦
      </Button>
      {aiGate ? <AiGateNotice reason={aiGate} /> : null}
    </div>
  );
}
