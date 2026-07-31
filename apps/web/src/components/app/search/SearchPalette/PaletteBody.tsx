import type { ReactElement } from "react";
import { cn } from "@/lib/utils";
import { SearchResults } from "./SearchResults";
import { AskPanel } from "./AskPanel";
import { Receipts } from "./AskPanel/Receipts";
import { SearchAskBridge } from "./SearchAskBridge";
import type { SearchMode } from "./useSearchPalette";
import type { AskStreamState } from "./useAskStream";
import type { SearchState } from "@/lib/actions/search";

interface PaletteBodyProps {
  wide: boolean;
  mode: SearchMode;
  query: string;
  search: { state: SearchState; pending: boolean };
  ask: { state: AskStreamState; pending: boolean };
  formId: string;
  onNavigate: () => void;
  onAsk: (question: string) => void;
  /** Why Ask Dhaga is greyed out (no AI credits left), or null. Never applied
   *  to the Search tab — keyword search spends no credits. */
  aiGate: string | null;
}

/**
 * The palette's scrollable body. Once there's an answer or search results
 * (`wide`), wide screens split into two panes: the answer/results on the left,
 * a right rail on the right — the Ask tab's source receipts, or a bridge that
 * turns a keyword search into a reasoned question. Below `lg` it stays a single
 * column: the search rail is hidden, and the Ask receipts stack beneath the
 * answer (where they've always been).
 */
export function PaletteBody({
  wide,
  mode,
  query,
  search,
  ask,
  formId,
  onNavigate,
  onAsk,
  aiGate,
}: PaletteBodyProps): ReactElement {
  return (
    <div className="max-h-[60vh] overflow-y-auto p-3">
      <div className={cn(wide && "lg:grid lg:grid-cols-[1fr_18rem] lg:gap-5")}>
        <div className="min-w-0">
          {mode === "search" ? (
            <SearchResults
              state={search.state}
              query={query}
              pending={search.pending}
              onNavigate={onNavigate}
            />
          ) : (
            <AskPanel
              state={ask.state}
              pending={ask.pending}
              hasQuery={query.trim().length > 0}
              formId={formId}
              onNavigate={onNavigate}
              aiGate={aiGate}
            />
          )}
        </div>

        {wide ? (
          <aside
            className={cn(
              "mt-5 border-t border-seam pt-4 lg:sticky lg:top-0 lg:mt-0 lg:self-start lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5",
              mode === "search" && "hidden lg:block",
            )}
          >
            {mode === "ask" ? (
              <Receipts receipts={ask.state.receipts} pending={ask.pending} onNavigate={onNavigate} />
            ) : (
              <SearchAskBridge query={query} onAsk={onAsk} aiGate={aiGate} />
            )}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
