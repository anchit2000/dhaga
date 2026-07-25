import { startTransition, useActionState, useEffect, useId, useState } from "react";
import { useDictation } from "@/components/app/contact/useDictation";
import {
  saveSearchWeightsAction,
  searchAction,
  type SearchState,
} from "@/lib/actions/search";
import type { SearchWeights } from "@/utils/constants/search";
import { useAskStream } from "./useAskStream";

const EMPTY_SEARCH: SearchState = { query: "", hits: [], unindexed: 0 };
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
  const askStream = useAskStream();
  const formId = useId();
  // Dictation must APPEND, not replace: engines fire onFinalText once per
  // finalized segment (the browser engine with continuous=true emits several
  // finals for one spoken sentence), so passing setQuery directly would
  // collapse a multi-segment sentence to only its last segment. Accumulate
  // each segment onto the current query — the same append pattern the note /
  // quick-add textareas use — via the functional updater so async finals
  // don't read a stale query. Typing/clearing still go through the Input's
  // onChange → setQuery(value), which replaces as before.
  const dictation = useDictation((text) =>
    setQuery((prev) => (prev ? `${prev.replace(/\s+$/, "")} ${text}` : text)),
  );

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

  /** Ask-Dhaga is metered streaming, not a server action: submitting the form
   *  in "ask" mode routes the query into the stream hook instead of dispatching
   *  askAiAction. The Search-mode form action (searchDispatch) is untouched. */
  function askFormAction(formData: FormData): void {
    askStream.submit(String(formData.get("q") ?? ""));
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
    dispatch: mode === "search" ? searchDispatch : askFormAction,
    // Stale the instant the query outruns the last dispatched search, not just
    // while the request is in flight — otherwise the 300ms debounce window
    // shows the previous query's results at full opacity with no cue that a
    // newer search is queued, which reads as "search stopped working" until
    // results suddenly swap in.
    search: { state: searchState, pending: searchPending || query.trim() !== searchState.query },
    ask: { state: askStream.state, pending: askStream.state.pending },
    dictation,
  };
}
