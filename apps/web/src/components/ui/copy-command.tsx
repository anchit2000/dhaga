"use client";

import { useState } from "react";
import type { ReactElement } from "react";
import { Check, Copy } from "lucide-react";

/**
 * A command or URL the user is meant to copy verbatim — install lines, the MCP
 * endpoint, a client config snippet.
 *
 * The command itself scrolls rather than wrapping: a wrapped shell line reads
 * as two commands, and this is copied by people who are about to paste it into
 * a terminal. The copy button stays put while it scrolls.
 */
export function CopyCommand({
  command,
  label,
  className = "",
}: {
  command: string;
  /** Describes what is being copied, for screen readers. */
  label: string;
  className?: string;
}): ReactElement {
  const [copied, setCopied] = useState(false);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable (insecure origin, denied permission) — the
         command stays selectable by hand, so there is nothing to report */
    }
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border border-line bg-ink/40 py-1 pl-3 pr-1 ${className}`}
    >
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap py-2 font-mono text-xs text-paper">
        {command}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? `${label} copied` : `Copy ${label}`}
        className="flex size-11 shrink-0 items-center justify-center rounded-lg text-fog transition-colors hover:bg-panel-2 hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trust/40"
      >
        {copied ? (
          <Check className="size-4 text-ember" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? `${label} copied to clipboard` : ""}
      </span>
    </div>
  );
}
