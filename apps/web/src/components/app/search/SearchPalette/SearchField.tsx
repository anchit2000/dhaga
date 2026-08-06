"use client";

import { Mic, Search, Square, X } from "lucide-react";
import { DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { DictationState } from "@/components/app/contact/useDictation";
import type { SearchMode } from "./useSearchPalette";

/**
 * The palette's query row: the field plus the dictation and close controls.
 * The search icon and the clear button sit *inside* the field's own padding
 * rather than flanking it, so the query text keeps a full gutter on both sides
 * instead of running flush into them.
 */
export function SearchField({
  formId,
  dispatch,
  query,
  onQueryChange,
  mode,
  dictation,
}: {
  formId: string;
  dispatch: (formData: FormData) => void;
  query: string;
  onQueryChange: (value: string) => void;
  mode: SearchMode;
  dictation: DictationState;
}) {
  return (
    <form id={formId} action={dispatch} role="search" className="flex items-center gap-3">
      <div className="relative flex min-w-0 flex-1 items-center">
        <Search className="pointer-events-none absolute left-3 size-4 text-fog" />
        <Input
          type="text"
          name="q"
          autoFocus
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={
            mode === "search"
              ? "Filter by name, fact, or note…"
              : "Who did I meet in logistics who mentioned an AI budget?"
          }
          className="h-11 rounded-lg pl-10 pr-11 text-sm"
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label="Clear search"
            className="absolute right-1 flex size-9 items-center justify-center rounded-full text-fog transition-colors hover:text-paper"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>
      {dictation.supported ? (
        <button
          type="button"
          onClick={dictation.listening ? dictation.stop : dictation.start}
          disabled={dictation.transcribing || dictation.loadingProgress !== null}
          aria-label={dictation.listening ? "Stop dictation" : "Search by voice"}
          className={`flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors disabled:opacity-60 ${
            dictation.listening
              ? "border-destructive/50 text-destructive"
              : "border-seam text-fog hover:text-paper"
          }`}
        >
          {dictation.listening ? <Square className="size-4" /> : <Mic className="size-4" />}
        </button>
      ) : null}
      <DialogClose
        aria-label="Close"
        className="flex size-11 shrink-0 items-center justify-center rounded-full border border-seam text-fog transition-colors hover:text-paper"
      >
        <X className="size-4" />
      </DialogClose>
    </form>
  );
}
