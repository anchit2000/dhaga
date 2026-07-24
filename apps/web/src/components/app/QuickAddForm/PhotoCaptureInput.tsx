"use client";

import { useState, type ChangeEvent } from "react";
import { Camera, Loader2, Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigationFeedback } from "@/components/app/NavigationFeedback";
import { detectLinkedInQrUrl } from "./detect-linkedin-qr";

/**
 * The "Card photo" mode's add-images surface. A card can be described by
 * SEVERAL photos (front+back, leaflet pages), so the file input is `multiple`
 * and a live-webcam entry point sits alongside it. Before any photo reaches
 * the tray it runs the client-side LinkedIn-QR pre-check on EACH selected
 * image (no upload): if any one is a LinkedIn profile QR it routes straight to
 * the manual-add form prefilled with that URL instead of card OCR — exactly as
 * the single-image flow did. Everything else falls through to onPhotosSelected.
 *
 * Renders full (empty tray: a dropzone) or compact (tray already has images: a
 * small add + camera toolbar); `disabled` turns both off once the tray is full.
 */
export function PhotoCaptureInput({
  storeCardPhotos,
  onPhotosSelected,
  onOpenWebcam,
  compact = false,
  disabled = false,
}: {
  storeCardPhotos: boolean;
  onPhotosSelected: (files: File[]) => void;
  onOpenWebcam: () => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  const { navigate } = useNavigationFeedback();
  const [checking, setChecking] = useState(false);

  async function handleFiles(files: File[]): Promise<void> {
    if (files.length === 0) return;
    setChecking(true);
    for (const file of files) {
      const linkedInUrl = await detectLinkedInQrUrl(file);
      if (linkedInUrl) {
        // Keep the "checking" spinner up through the nav; navigate() also lights
        // the app-shell top bar so the jump doesn't feel like a dead click.
        navigate(`/app/people/new?linkedin=${encodeURIComponent(linkedInUrl)}`);
        return;
      }
    }
    setChecking(false);
    onPhotosSelected(files);
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>): void {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (files.length > 0) void handleFiles(files);
  }

  const inputDisabled = disabled || checking;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <label
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "cursor-pointer",
            inputDisabled && "pointer-events-none opacity-50",
          )}
          aria-disabled={inputDisabled}
        >
          {checking ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          {checking ? "Checking…" : "Add photos"}
          <input
            type="file"
            name="photo"
            accept="image/*"
            multiple
            disabled={inputDisabled}
            className="sr-only"
            onChange={onInputChange}
          />
        </label>
        <Button type="button" variant="outline" size="sm" onClick={onOpenWebcam} disabled={disabled}>
          <Camera className="size-4" />
          Camera
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label
        className={cn(
          "flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-seam bg-panel/40 p-6 text-center transition-colors hover:border-amber/40",
          inputDisabled && "pointer-events-none opacity-50",
        )}
        aria-disabled={inputDisabled}
      >
        {checking ? (
          <Loader2 className="size-6 animate-spin text-ember" aria-hidden />
        ) : (
          <Camera className="size-6 text-ember" aria-hidden />
        )}
        <span className="text-sm text-paper">
          {checking ? "Checking photo…" : "Take or choose card photos"}
        </span>
        <span className="text-xs text-fog">
          Front, back, or multiple pages — they all merge into one contact.
        </span>
        <span className="text-xs text-fog">
          {storeCardPhotos
            ? "Parsed by AI; the photos are kept in your database as the visual receipt (turn off in Settings)."
            : "Parsed by AI; the photos themselves are not stored — only the transcription, as the receipt."}
        </span>
        <input
          type="file"
          name="photo"
          accept="image/*"
          multiple
          disabled={inputDisabled}
          className="sr-only"
          onChange={onInputChange}
        />
      </label>
      <Button type="button" variant="outline" onClick={onOpenWebcam} className="w-full" disabled={disabled}>
        <Camera className="size-4" />
        Use live camera
      </Button>
    </div>
  );
}
