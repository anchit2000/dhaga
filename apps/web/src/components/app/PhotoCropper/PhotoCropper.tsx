"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CropOverlay } from "./CropOverlay";
import { useCropRect } from "./useCropRect";

/** Full-screen crop step shown between capture and upload: trims desk
 *  background/glare from a card photo before it's sent for OCR. Draggable
 *  rect + 4 corner handles, mouse and touch alike via the Pointer Events API. */
export function PhotoCropper({
  file,
  onConfirm,
  onCancel,
}: {
  file: File;
  onConfirm: (cropped: File) => void;
  onCancel: () => void;
}) {
  const [url] = useState(() => URL.createObjectURL(file));
  const imgRef = useRef<HTMLImageElement>(null);
  const [busy, setBusy] = useState(false);
  const { rect, displaySize, onImageLoad, beginDrag, onDragMove, endDrag } = useCropRect();

  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  async function handleConfirm(): Promise<void> {
    const img = imgRef.current;
    if (!img || !rect || !displaySize) return;
    setBusy(true);
    try {
      const scaleX = img.naturalWidth / displaySize.width;
      const scaleY = img.naturalHeight / displaySize.height;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(rect.width * scaleX));
      canvas.height = Math.max(1, Math.round(rect.height * scaleY));
      const context = canvas.getContext("2d");
      if (!context) {
        onCancel();
        return;
      }
      context.drawImage(
        img,
        rect.x * scaleX,
        rect.y * scaleY,
        rect.width * scaleX,
        rect.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.92),
      );
      if (!blob) {
        onCancel();
        return;
      }
      onConfirm(new File([blob], "card.jpg", { type: "image/jpeg" }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-ink/95 p-4">
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        onClick={onCancel}
        aria-label="Cancel crop"
        className="absolute right-4 top-4 size-11"
      >
        <X className="size-5" />
      </Button>
      <p className="text-sm text-fog">Drag the corners to crop out background and glare</p>
      <div className="relative inline-block max-h-[65vh] max-w-full touch-none select-none">
        {/* eslint-disable-next-line @next/next/no-img-element -- object URL from a local file, not an optimizable remote asset */}
        <img
          ref={imgRef}
          src={url}
          alt="Card to crop"
          onLoad={(event) => onImageLoad(event.currentTarget)}
          draggable={false}
          className="block max-h-[65vh] max-w-full rounded-2xl"
        />
        {rect ? (
          <CropOverlay rect={rect} onDragStart={beginDrag} onDragMove={onDragMove} onDragEnd={endDrag} />
        ) : null}
      </div>
      <div className="flex gap-3">
        <Button type="button" variant="outline" size="lg" onClick={onCancel} disabled={busy}>
          Retake
        </Button>
        <Button type="button" size="lg" onClick={handleConfirm} disabled={busy || !rect}>
          <Check className="size-5" />
          {busy ? "Processing…" : "Use photo"}
        </Button>
      </div>
    </div>
  );
}
