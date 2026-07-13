import { startTransition, useActionState, useEffect, useId, useState } from "react";
import { useDictation } from "@/components/app/contact/useDictation";
import {
  askAiAction,
  saveSearchWeightsAction,
  searchAction,
  type AskAiState,
  type SearchState,
} from "@/lib/actions/search";
import type { SearchWeights } from "@/utils/constants/search";

const EMPTY_SEARCH: SearchState = { query: "", hits: [], unindexed: 0 };
const EMPTY_ASK: AskAiState = {};
const SEARCH_DEBOUNCE_MS = 300;

export type SearchMode = "search" | "ask";

/**
 * All SearchPalette state + effects, split out from the JSX so both stay
 * under the file-length rule. "Search" behaves like a real search bar —
 * instant, debounced, local keyword + semantic matching, free — and
 * re-fires on weight changes too, so the "Tune ranking" sliders re-rank
 * results live. "Ask Dhaga" is the agentic Sonnet pipeline: it never
 * auto-fires on keystrokes since it's a metered AI action, only on submit.
 */
export function useSearchPalette(initialWeights: SearchWeights) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<SearchMode>("search");
  const [query, setQuery] = useState("");
  const [weights, setWeights] = useState<SearchWeights>(initialWeights);
  const [showTuner, setShowTuner] = useState(false);
  const [searchState, searchDispatch, searchPending] = useActionState(
    searchAction,
    EMPTY_SEARCH,
  );
  const [askState, askDispatch, askPending] = useActionState(askAiAction, EMPTY_ASK);
  const formId = useId();
  const dictation = useDictation(setQuery);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (mode !== "search" || !query.trim()) return;
    const timer = setTimeout(() => {
      const data = new FormData();
      data.set("q", query);
      data.set("weights", JSON.stringify(weights));
      startTransition(() => searchDispatch(data));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, mode, weights, searchDispatch]);

  /** Persists on drag-end only — the live re-rank while dragging goes
   *  through the debounced effect above, not a DB write per pixel. */
  function commitWeights(next: SearchWeights): void {
    setWeights(next);
    void saveSearchWeightsAction(next);
  }

  return {
    open,
    setOpen,
    mode,
    setMode,
    query,
    setQuery,
    weights,
    setWeights,
    commitWeights,
    showTuner,
    setShowTuner,
    formId,
    dispatch: mode === "search" ? searchDispatch : askDispatch,
    // Stale the instant the query outruns the last dispatched search, not just
    // while the request is in flight — otherwise the 300ms debounce window
    // shows the previous query's results at full opacity with no cue that a
    // newer search is queued, which reads as "search stopped working" until
    // results suddenly swap in.
    search: { state: searchState, pending: searchPending || query.trim() !== searchState.query },
    ask: { state: askState, pending: askPending },
    dictation,
  };
}
