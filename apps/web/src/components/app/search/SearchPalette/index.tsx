"use client";

import { startTransition, useActionState, useEffect, useId, useState } from "react";
import { Mic, Search, Sparkles, Square } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDictation } from "@/components/app/contact/useDictation";
import {
  askAiAction,
  searchAction,
  type AskAiState,
  type SearchState,
} from "@/lib/actions/search";
import { SearchResults } from "./SearchResults";
import { AskPanel } from "./AskPanel";

const EMPTY_SEARCH: SearchState = { query: "", hits: [], unindexed: 0 };
const EMPTY_ASK: AskAiState = {};
const SEARCH_DEBOUNCE_MS = 300;

type SearchMode = "search" | "ask";

/**
 * Global search: a nav trigger + Cmd/Ctrl+K open a centered palette with two
 * tabs. "Search" behaves like a real search bar — instant, debounced, local
 * keyword + semantic matching, free. "Ask Dhaga" is the agentic Sonnet pipeline
 * (query understanding → retrieval → reasoned answer with receipts) — it
 * never auto-fires on keystrokes since it's a metered AI action; only an
 * explicit submit (Enter or the button) runs it.
 */
export function SearchPalette() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<SearchMode>("search");
  const [query, setQuery] = useState("");
  const [searchState, searchDispatch, searchPending] = useActionState(
    searchAction,
    EMPTY_SEARCH,
  );
  const [askState, askDispatch, askPending] = useActionState(askAiAction, EMPTY_ASK);
  const formId = useId();
  const { supported, listening, start, stop } = useDictation(setQuery);

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
      startTransition(() => searchDispatch(data));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, mode, searchDispatch]);

  const dispatch = mode === "search" ? searchDispatch : askDispatch;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search your network"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-seam bg-panel-2/60 text-fog transition-colors hover:border-paper/30 hover:text-paper sm:w-full sm:max-w-sm sm:justify-start sm:gap-2 sm:rounded-full sm:px-3"
      >
        <Search className="size-4 shrink-0" />
        <span className="hidden flex-1 text-left text-sm sm:inline">
          Search your network…
        </span>
        <kbd className="hidden shrink-0 rounded border border-seam bg-ink/60 px-1.5 py-0.5 font-mono text-[10px] text-fog sm:inline">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg gap-0 p-0 sm:max-w-lg">
          <DialogTitle className="sr-only">Search</DialogTitle>

          <div className="space-y-2 border-b border-seam p-3">
            <form id={formId} action={dispatch} role="search" className="flex items-center gap-2">
              <Search className="size-4 shrink-0 text-fog" />
              <Input
                type="search"
                name="q"
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  mode === "search"
                    ? "Filter by name, fact, or note…"
                    : "Who did I meet in logistics who mentioned an AI budget?"
                }
                className="h-9 flex-1 border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
              {supported ? (
                <button
                  type="button"
                  onClick={listening ? stop : start}
                  aria-label={listening ? "Stop dictation" : "Search by voice"}
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    listening
                      ? "border-red-400/50 text-red-400"
                      : "border-seam text-fog hover:text-paper"
                  }`}
                >
                  {listening ? <Square className="size-4" /> : <Mic className="size-4" />}
                </button>
              ) : null}
            </form>

            <Tabs value={mode} onValueChange={(value) => setMode(value as SearchMode)}>
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
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-3">
            {mode === "search" ? (
              <SearchResults
                state={searchState}
                query={query}
                pending={searchPending}
                onNavigate={() => setOpen(false)}
              />
            ) : (
              <AskPanel
                state={askState}
                pending={askPending}
                hasQuery={query.trim().length > 0}
                formId={formId}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
