"use client";

import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { previewSentence } from "./predicate-options";

/** Live "Ajay — father of → Anchit" sentence with the direction toggle —
 *  this is what makes edge direction legible before the user commits. */
export function DirectionPreview({
  sourceName,
  forward,
  targetName,
  flipped,
  onFlip,
}: {
  sourceName: string;
  forward: string;
  targetName: string;
  flipped: boolean;
  onFlip: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber/20 bg-amber/[0.04] px-3 py-2">
      {/* Wraps rather than truncates: this sentence exists to make the edge's
          direction legible, and "Ajay Prasad Shr…" doesn't. It can only wrap
          because DialogContent lets its grid items shrink (see dialog/root). */}
      <p className="min-w-0 break-words font-mono text-xs text-ember">
        {previewSentence(sourceName, forward, targetName, flipped)}
      </p>
      <Button type="button" variant="ghost" size="sm" onClick={onFlip}>
        <ArrowLeftRight />
        Swap
      </Button>
    </div>
  );
}
