import { useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";

import { type CameraCaptureHandle, type CapturedPhoto } from "@/components/camera-capture-view";
import { buildScanPayload } from "@/lib/ocr";

import type { CaptureRequest } from "@dhaga/core/src/api/capture";
import type { ScanOutcome, ScanPath } from "@/types";

interface PhotoCaptureDeps {
  busy: boolean;
  setBusy: (busy: boolean) => void;
  setOutcome: (outcome: ScanOutcome | null) => void;
  finish: (request: CaptureRequest, path: ScanPath) => Promise<void>;
}

/**
 * The three ways a photo becomes a saved contact — camera shutter, photo
 * library, or the cropped confirmation of either — plus the pending-photo
 * state the crop-review step reads. Split out of useCaptureFlow to keep that
 * hook under the file-length limit; submission itself stays in the parent via
 * the injected `finish`.
 */
export function usePhotoCapture({ busy, setBusy, setOutcome, finish }: PhotoCaptureDeps) {
  const cameraRef = useRef<CameraCaptureHandle>(null);
  const [pendingPhoto, setPendingPhoto] = useState<CapturedPhoto | null>(null);

  async function shootCamera(): Promise<void> {
    if (busy) return;
    try {
      const photo = await cameraRef.current?.capture();
      if (!photo) return;
      setPendingPhoto(photo);
    } catch (error) {
      setOutcome({ kind: "error", message: error instanceof Error ? error.message : "The camera didn't return a photo." });
    }
  }

  async function pickFromLibrary(): Promise<void> {
    if (busy) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setOutcome({ kind: "error", message: "Photo library access is needed to pick a card photo." });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"] });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    // The library doesn't always report dimensions; skip the crop step rather than divide by zero.
    if (asset.width > 0 && asset.height > 0) {
      setPendingPhoto({ uri: asset.uri, width: asset.width, height: asset.height });
    } else {
      await applyCroppedPhoto(asset.uri);
    }
  }

  /** Confirms the crop review step: crop→OCR pipeline for whichever photo (camera or library) started it.
   * Holds `busy` for the whole pipeline, not just `finish()` — otherwise the gap between "crop confirmed"
   * and "OCR done" leaves the camera/dock fully interactive, letting a second shutter press or library pick
   * start a concurrent capture (and a second POST /api/capture) before the first one resolves. */
  async function applyCroppedPhoto(uri: string): Promise<void> {
    if (busy) return;
    setPendingPhoto(null);
    setBusy(true);
    try {
      const payload = await buildScanPayload(uri);
      await finish(payload.request, payload.path);
    } catch (error) {
      setOutcome({ kind: "error", message: error instanceof Error ? error.message : "Couldn't process that photo." });
      setBusy(false);
    }
  }

  return { cameraRef, pendingPhoto, setPendingPhoto, shootCamera, pickFromLibrary, applyCroppedPhoto };
}
