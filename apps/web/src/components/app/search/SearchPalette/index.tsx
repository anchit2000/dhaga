"use client";

import { Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_SEARCH_WEIGHTS, type SearchWeights } from "@/utils/constants/search";
import { PaletteBody } from "./PaletteBody";
import { SearchField } from "./SearchField";
import { SearchTrigger } from "./SearchTrigger";
import { WeightTuner } from "./WeightTuner";
import { useSearchPalette, type SearchMode } from "./useSearchPalette";
import { useAiGate } from "@/components/app/useAiGate";
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
  // The palette mounts from the client-only app shell, so the AI-credit gate is
  // fetched rather than passed down — lazily, once the palette is opened. Only
  // Ask Dhaga is gated; the keyword Search tab spends no credits and stays live.
  const aiGate = useAiGate(p.open);

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

          <div className="space-y-3 border-b border-seam p-4">
            <SearchField
              formId={p.formId}
              dispatch={p.dispatch}
              query={p.query}
              onQueryChange={p.setQuery}
              mode={p.mode}
              dictation={p.dictation}
            />
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
            <WeightTuner
              weights={p.weights}
              onChange={p.setWeights}
              onCommit={p.commitWeights}
              semanticEnabled={p.search.state.semanticEnabled}
            />
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
            aiGate={aiGate}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
