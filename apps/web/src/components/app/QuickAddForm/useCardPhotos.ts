"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { MAX_CARD_IMAGES } from "@/utils/constants/app";
import type { CaptureMode } from "./capture-mode";

/**
 * The card-photo tray: the images that describe ONE contact, plus the dock's
 * hand-off into it. Camera frames from the dock land in the tray rather than
 * going straight to extraction — the tray is where crop / reorder / remove
 * live, and its own Scan button starts the scan once the images look right.
 * Lifted out of QuickAddForm so that component stays a render orchestrator
 * under the 150-line rule (same reason as useCaptureDialog / useQuickAdd).
 */
export function useCardPhotos(
  setMode: (mode: CaptureMode) => void,
  setCaptureOpen: (open: boolean) => void,
): {
  photos: File[];
  setPhotos: Dispatch<SetStateAction<File[]>>;
  onPhotosCaptured: (files: File[]) => void;
} {
  const [photos, setPhotos] = useState<File[]>([]);

  const onPhotosCaptured = (files: File[]): void => {
    if (files.length === 0) return;
    setPhotos((previous) => [...previous, ...files].slice(0, MAX_CARD_IMAGES));
    setMode("photo");
    setCaptureOpen(true);
  };

  return { photos, setPhotos, onPhotosCaptured };
}
