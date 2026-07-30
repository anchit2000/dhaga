"use client";

import { useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Crop, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Horizontally scrollable tray of the images that describe ONE capture — the
 * pages of a card (front, back, leaflet) or the photos behind a photo note.
 * Each thumbnail can be removed, reordered with left/right move buttons (no
 * drag-drop dependency — see docs/LIBRARIES.md), and optionally cropped. The
 * count badge reflects the caller's cap; the "add" affordance lives with the
 * caller, which disables it once the tray is full.
 *
 * `subject` names what the images belong to, so the count reads truthfully on
 * both surfaces ("2 images of this card" vs "…of this note").
 */
export function ImageTray({
  files,
  max,
  subject = "this card",
  onRemove,
  onMoveLeft,
  onMoveRight,
  onCrop,
}: {
  files: File[];
  max: number;
  subject?: string;
  onRemove: (index: number) => void;
  onMoveLeft: (index: number) => void;
  onMoveRight: (index: number) => void;
  onCrop: (index: number) => void;
}) {
  // Object URLs are recreated whenever the file list changes; the cleanup on
  // the previous list runs first, so nothing leaks across reorders/removals.
  const urls = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => urls.forEach((url) => URL.revokeObjectURL(url)), [urls]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-fog">
          {files.length === 1
            ? `1 image of ${subject}`
            : `${files.length} images of ${subject}`}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-fog">
          {files.length}/{max}
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {files.map((file, index) => (
          <div key={`${file.name}-${file.lastModified}-${index}`} className="shrink-0">
            <div className="relative h-28 w-36 overflow-hidden rounded-xl border border-seam bg-panel">
              {/* eslint-disable-next-line @next/next/no-img-element -- object URL from a local file, not an optimizable remote asset */}
              <img
                src={urls[index]}
                alt={`Image ${index + 1}`}
                className="size-full object-cover"
              />
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                onClick={() => onRemove(index)}
                aria-label={`Remove image ${index + 1}`}
                className="absolute right-1 top-1 size-11 rounded-full bg-ink/70"
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="mt-1.5 flex w-36 items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                onClick={() => onMoveLeft(index)}
                disabled={index === 0}
                aria-label={`Move image ${index + 1} left`}
                className="size-11"
              >
                <ChevronLeft className="size-5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                onClick={() => onCrop(index)}
                aria-label={`Crop image ${index + 1}`}
                className="size-11"
              >
                <Crop className="size-5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                onClick={() => onMoveRight(index)}
                disabled={index === files.length - 1}
                aria-label={`Move image ${index + 1} right`}
                className="size-11"
              >
                <ChevronRight className="size-5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
