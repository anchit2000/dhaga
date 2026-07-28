"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

/**
 * Tap-to-fix voice-note review — the "tap a word, it auto-teaches" surface for
 * Dhaga Voice (Moonshine) transcripts. Renders `text` as tappable word-chips;
 * tapping a chip swaps it for an inline input, and committing (Enter / blur)
 * replaces ONLY that whole-word token — never a substring, so fixing "cat" can't
 * touch "category". Every fix bubbles up twice: `onChange` with the full edited
 * text (the parent keeps the note field in sync) and `onWordFix(before, after)`
 * with the corrected word, so the caller can auto-teach the spelling. Pure view:
 * it owns no vocab/teaching code, only the token edit.
 */
export interface VoiceNoteReviewProps {
  /** The transcript to render; the parent owns it and re-feeds the edited value. */
  text: string;
  /** The full edited text after a word fix — sync this into the note field. */
  onChange: (next: string) => void;
  /** The corrected word (misheard → fixed), stripped of edge punctuation. */
  onWordFix?: (before: string, after: string) => void;
}

const WHITESPACE = /^\s+$/;

/** Strip leading/trailing punctuation so we teach "Raul", not "Raul,". */
function core(word: string): string {
  return word.replace(/^[^\p{L}\p{N}]+/u, "").replace(/[^\p{L}\p{N}]+$/u, "");
}

export function VoiceNoteReview({ text, onChange, onWordFix }: VoiceNoteReviewProps) {
  // Split on runs of whitespace, KEEPING the separators, so join("") is lossless
  // and the original spacing survives even though we don't render space chips.
  const tokens = useMemo(() => text.split(/(\s+)/), [text]);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  function open(index: number, word: string): void {
    setDraft(word);
    setEditing(index);
  }

  function commit(index: number): void {
    const before = tokens[index] ?? "";
    const next = draft.trim();
    setEditing(null);
    if (!next || next === before) return;
    const updated = [...tokens];
    updated[index] = next;
    onChange(updated.join(""));
    const from = core(before);
    const to = core(next);
    if (to && to.toLowerCase() !== from.toLowerCase()) onWordFix?.(from, to);
  }

  return (
    <div className="space-y-2 rounded-lg border border-seam bg-panel/60 p-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-fog">
        Tap a word to fix it — Dhaga learns the spelling
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {tokens.map((token, index) => {
          if (token === "" || WHITESPACE.test(token)) return null;
          if (editing === index) {
            return (
              <Input
                key={index}
                autoFocus
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onFocus={(event) => event.currentTarget.select()}
                onBlur={() => commit(index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commit(index);
                  } else if (event.key === "Escape") {
                    setEditing(null);
                  }
                }}
                className="h-11 w-auto min-w-[6rem] max-w-[12rem]"
              />
            );
          }
          return (
            <button
              key={index}
              type="button"
              onClick={() => open(index, token)}
              title="Tap to fix & teach"
              className="inline-flex min-h-[32px] items-center rounded-md border border-transparent px-2 py-1 text-sm text-paper transition-colors hover:border-amber/40 hover:bg-amber/10 hover:text-ember focus-visible:border-amber/50 focus-visible:bg-amber/10 focus-visible:text-ember focus-visible:outline-none"
            >
              {token}
            </button>
          );
        })}
      </div>
    </div>
  );
}
