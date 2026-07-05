"use client";

import { useRef } from "react";
import { Mic, Square } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDictation } from "../contact/useDictation";

/** Search box with an optional voice-query mic — speak a question, it fills the box and submits. */
export function SearchInput({ defaultValue }: { defaultValue: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { supported, listening, start, stop } = useDictation((text) => {
    const el = inputRef.current;
    if (!el) return;
    el.value = text;
    formRef.current?.requestSubmit();
  });

  return (
    <form ref={formRef} method="GET" role="search" className="flex items-center gap-2">
      <Input
        ref={inputRef}
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Who did I meet in logistics who mentioned an AI budget?"
        className="h-11"
      />
      {supported ? (
        <button
          type="button"
          onClick={listening ? stop : start}
          aria-label={listening ? "Stop dictation" : "Search by voice"}
          className={`flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors ${
            listening ? "border-red-400/50 text-red-400" : "border-seam text-fog hover:text-paper"
          }`}
        >
          {listening ? <Square className="size-4" /> : <Mic className="size-4" />}
        </button>
      ) : null}
    </form>
  );
}
