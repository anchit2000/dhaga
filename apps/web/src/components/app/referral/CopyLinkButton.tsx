"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactElement } from "react";

/** Copies `url` to the clipboard with a transient "Copied" confirmation. */
export function CopyLinkButton({ url }: { url: string }): ReactElement {
  const [copied, setCopied] = useState(false);

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={copy}
      aria-label="Copy invite link"
      className="min-h-[44px] shrink-0"
    >
      {copied ? <Check className="text-amber" /> : <Copy />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}
