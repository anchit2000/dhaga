"use client";

import { useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { useNavigationFeedback } from "@/components/app/NavigationFeedback";
import { detectLinkedInQrUrl } from "./detect-linkedin-qr";

/**
 * The "Card photo" mode's file input. Before handing a photo to the existing
 * card-scan flow, it checks (client-side, no upload) whether the photo is
 * actually a LinkedIn profile QR code — if so it routes straight to the
 * existing manual-add form prefilled with that URL instead of running AI
 * card OCR on it. Any other photo (no QR, unsupported browser, non-LinkedIn
 * QR) falls through to onPhotoSelected exactly as before.
 */
export function PhotoCaptureInput({
  storeCardPhotos,
  onPhotoSelected,
}: {
  storeCardPhotos: boolean;
  onPhotoSelected: (file: File) => void;
}) {
  const { navigate } = useNavigationFeedback();
  const [checking, setChecking] = useState(false);

  async function handleFile(file: File): Promise<void> {
    setChecking(true);
    const linkedInUrl = await detectLinkedInQrUrl(file);
    if (linkedInUrl) {
      // Keep the "checking" spinner up through the nav; navigate() also lights
      // the app-shell top bar so the jump doesn't feel like a dead click.
      navigate(`/app/people/new?linkedin=${encodeURIComponent(linkedInUrl)}`);
      return;
    }
    setChecking(false);
    onPhotoSelected(file);
  }

  return (
    <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-seam bg-panel/40 p-6 text-center transition-colors hover:border-amber/40">
      {checking ? (
        <Loader2 className="size-6 animate-spin text-ember" aria-hidden />
      ) : (
        <Camera className="size-6 text-ember" aria-hidden />
      )}
      <span className="text-sm text-paper">
        {checking ? "Checking photo…" : "Take or choose a card photo"}
      </span>
      <span className="text-xs text-fog">
        {storeCardPhotos
          ? "Parsed by AI; the photo is kept in your database as the visual receipt (turn off in Settings)."
          : "Parsed by AI; the photo itself is not stored — only the transcription, as the receipt."}
      </span>
      <input
        type="file"
        name="photo"
        accept="image/*"
        capture="environment"
        required
        disabled={checking}
        className="sr-only"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void handleFile(file);
        }}
      />
    </label>
  );
}
