"use client";

import { Mic, Search, SlidersHorizontal, Sparkles, Square } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_SEARCH_WEIGHTS, type SearchWeights } from "@/utils/constants/search";
import { SearchResults } from "./SearchResults";
import { AskPanel } from "./AskPanel";
import { WeightTuner } from "./WeightTuner";
import { useSearchPalette, type SearchMode } from "./useSearchPalette";

/**
 * Global search: a nav trigger + Cmd/Ctrl+K open a centered palette with two
 * tabs — see useSearchPalette for the Search-vs-Ask-Dhaga behavior.
 */
export function SearchPalette({
  initialWeights = DEFAULT_SEARCH_WEIGHTS,
}: {
  initialWeights?: SearchWeights;
}) {
  const p = useSearchPalette(initialWeights);

  return (
    <>
      <button
        type="button"
        onClick={() => p.setOpen(true)}
        aria-label="Search your network"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-seam bg-panel-2/60 text-fog transition-colors hover:border-paper/30 hover:text-paper sm:w-full sm:max-w-2xl sm:justify-start sm:gap-2 sm:rounded-full sm:px-3"
      >
        <Search className="size-4 shrink-0" />
        <span className="hidden flex-1 text-left text-sm sm:inline">
          Search your network…
        </span>
        <kbd className="hidden shrink-0 rounded border border-seam bg-ink/60 px-1.5 py-0.5 font-mono text-[10px] text-fog sm:inline">
          ⌘K
        </kbd>
      </button>

      <Dialog open={p.open} onOpenChange={p.setOpen}>
        <DialogContent className="max-w-lg gap-0 p-0 sm:max-w-lg">
          <DialogTitle className="sr-only">Search</DialogTitle>

          <div className="space-y-2 border-b border-seam p-3">
            <form
              id={p.formId}
              action={p.dispatch}
              role="search"
              className="flex items-center gap-2"
            >
              <Search className="size-4 shrink-0 text-fog" />
              <Input
                type="search"
                name="q"
                autoFocus
                value={p.query}
                onChange={(event) => p.setQuery(event.target.value)}
                placeholder={
                  p.mode === "search"
                    ? "Filter by name, fact, or note…"
                    : "Who did I meet in logistics who mentioned an AI budget?"
                }
                className="h-9 flex-1 border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
              {p.dictation.supported ? (
                <button
                  type="button"
                  onClick={p.dictation.listening ? p.dictation.stop : p.dictation.start}
                  aria-label={p.dictation.listening ? "Stop dictation" : "Search by voice"}
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    p.dictation.listening
                      ? "border-red-400/50 text-red-400"
                      : "border-seam text-fog hover:text-paper"
                  }`}
                >
                  {p.dictation.listening ? <Square className="size-4" /> : <Mic className="size-4" />}
                </button>
              ) : null}
            </form>

            <div className="flex items-center justify-between gap-2">
              <Tabs
                value={p.mode}
                onValueChange={(value) => p.setMode(value as SearchMode)}
              >
                <TabsList variant="line">
                  <TabsTrigger value="search">
                    <Search className="size-3.5" />
                    Search
                  </TabsTrigger>
                  <TabsTrigger value="ask">
                    <Sparkles className="size-3.5" />
                    Ask Dhaga
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              {p.mode === "search" ? (
                <button
                  type="button"
                  onClick={() => p.setShowTuner((value) => !value)}
                  aria-label="Tune ranking"
                  aria-pressed={p.showTuner}
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    p.showTuner
                      ? "border-amber/40 text-amber"
                      : "border-seam text-fog hover:text-paper"
                  }`}
                >
                  <SlidersHorizontal className="size-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          {p.mode === "search" && p.showTuner ? (
            <WeightTuner weights={p.weights} onChange={p.setWeights} onCommit={p.commitWeights} />
          ) : null}

          <div className="max-h-[60vh] overflow-y-auto p-3">
            {p.mode === "search" ? (
              <SearchResults
                state={p.search.state}
                query={p.query}
                pending={p.search.pending}
                onNavigate={() => p.setOpen(false)}
              />
            ) : (
              <AskPanel
                state={p.ask.state}
                pending={p.ask.pending}
                hasQuery={p.query.trim().length > 0}
                formId={p.formId}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
