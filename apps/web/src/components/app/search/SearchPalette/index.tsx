"use client";

import { Mic, Search, SlidersHorizontal, Sparkles, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_SEARCH_WEIGHTS, type SearchWeights } from "@/utils/constants/search";
import { PaletteBody } from "./PaletteBody";
import { SearchTrigger } from "./SearchTrigger";
import { WeightTuner } from "./WeightTuner";
import { useSearchPalette, type SearchMode } from "./useSearchPalette";
import { DictationProgress } from "@/components/app/contact/DictationProgress";

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
      <SearchTrigger onOpen={() => p.setOpen(true)} />

      <Dialog open={p.open} onOpenChange={p.setOpen}>
        <DialogContent
          showCloseButton={false}
          className={cn(
            "max-w-lg gap-0 p-0 sm:max-w-lg",
            p.wide && "sm:max-w-3xl lg:max-w-4xl",
          )}
        >
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
                className="h-9 flex-1 border-none bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
              />
              {p.dictation.supported ? (
                <button
                  type="button"
                  onClick={p.dictation.listening ? p.dictation.stop : p.dictation.start}
                  disabled={p.dictation.transcribing || p.dictation.loadingProgress !== null}
                  aria-label={p.dictation.listening ? "Stop dictation" : "Search by voice"}
                  className={`flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-60 ${
                    p.dictation.listening
                      ? "border-red-400/50 text-red-400"
                      : "border-seam text-fog hover:text-paper"
                  }`}
                >
                  {p.dictation.listening ? <Square className="size-4" /> : <Mic className="size-4" />}
                </button>
              ) : null}
              <DialogClose
                aria-label="Close"
                className="flex size-11 shrink-0 items-center justify-center rounded-full border border-seam text-fog transition-colors hover:text-paper"
              >
                <X className="size-4" />
              </DialogClose>
            </form>
            <DictationProgress
              loadingProgress={p.dictation.loadingProgress}
              transcribing={p.dictation.transcribing}
              partialText={p.dictation.partialText}
            />

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
                      ? "border-amber/40 text-ember"
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

          <PaletteBody
            wide={p.wide}
            mode={p.mode}
            query={p.query}
            search={p.search}
            ask={p.ask}
            formId={p.formId}
            onNavigate={() => p.setOpen(false)}
            onAsk={p.runAsk}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
