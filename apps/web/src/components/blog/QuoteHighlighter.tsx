"use client";

import { useEffect, useState } from "react";
import { Check, Quote } from "lucide-react";
import { TwitterShareButton, LinkedinShareButton, XIcon, LinkedinIcon } from "react-share";
import type { ReactElement } from "react";

interface QuoteHighlighterProps {
  url: string;
}

interface PopoverState {
  text: string;
  top: number;
  left: number;
}

const MIN_LEN = 12;
const MAX_LEN = 320;

// Highlight-to-share: when the reader selects a passage, a small floating
// popover offers to share the quote to X / LinkedIn or copy it with the post
// link. Fixed positioning (viewport coords) so it tracks the visible selection.
export function QuoteHighlighter({ url }: QuoteHighlighterProps): ReactElement | null {
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function onMouseUp(): void {
      const selection = window.getSelection();
      const text = selection?.toString().trim() ?? "";
      if (!selection || selection.rangeCount === 0 || text.length < MIN_LEN || text.length > MAX_LEN) {
        setPopover(null);
        return;
      }
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      setPopover({ text, top: rect.top - 52, left: rect.left + rect.width / 2 });
      setCopied(false);
    }
    function onSelectionChange(): void {
      if (!window.getSelection()?.toString().trim()) setPopover(null);
    }
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  }, []);

  if (!popover) return null;

  const quote = `"${popover.text}"`;

  async function copyQuote(): Promise<void> {
    try {
      await navigator.clipboard.writeText(`${quote}\n\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }

  return (
    <div
      className="fixed z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-seam bg-panel px-2 py-1 shadow-lg"
      style={{ top: popover.top, left: popover.left }}
    >
      <Quote className="ml-1 size-3.5 text-fog" />
      <TwitterShareButton url={url} title={quote}>
        <XIcon size={22} round />
      </TwitterShareButton>
      <LinkedinShareButton url={url} title={quote} summary={popover.text}>
        <LinkedinIcon size={22} round />
      </LinkedinShareButton>
      <button
        type="button"
        onClick={copyQuote}
        aria-label="Copy quote"
        className="px-2 py-1 text-xs text-fog hover:text-paper"
      >
        {copied ? <Check className="size-4 text-amber" /> : "Copy"}
      </button>
    </div>
  );
}
