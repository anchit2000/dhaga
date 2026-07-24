import { useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";

import { type CameraCaptureHandle, type CapturedPhoto } from "@/components/camera-capture-view";
import { buildScanPayload } from "@/lib/ocr";
import { MAX_SCAN_IMAGES } from "@/utils/constants";

import type { CaptureRequest } from "@dhaga/core/src/api/capture";
import type { ScanOutcome, ScanPath } from "@/types";

interface PhotoCaptureDeps {
  busy: boolean;
  setBusy: (busy: boolean) => void;
  setOutcome: (outcome: ScanOutcome | null) => void;
  finish: (request: CaptureRequest, path: ScanPath) => Promise<void>;
}

const TOO_MANY = `You can add up to ${MAX_SCAN_IMAGES} photos per contact.`;

/**
 * Photo acquisition for the capture screen: several photos of the SAME
 * card/leaflet (front+back, or pages) captured together — camera multi-shot or
 * photo-library multi-select — then reviewed as a strip and scanned into one
 * merged contact. Split out of useCaptureFlow to keep that hook under the
 * file-length limit; submission itself stays in the parent via injected `finish`.
 */
export function usePhotoCapture({ busy, setBusy, setOutcome, finish }: PhotoCaptureDeps) {
  const cameraRef = useRef<CameraCaptureHandle>(null);
  // Photos captured but not yet scanned; `reviewing` gates the crop-strip step
  // so camera multi-shot can keep the preview open while the count climbs.
  const [pendingPhotos, setPendingPhotos] = useState<CapturedPhoto[]>([]);
  const [reviewing, setReviewing] = useState(false);

  /** Camera shutter: appends one photo, keeping the preview open for the next shot. */
  async function shootCamera(): Promise<void> {
    if (busy) return;
    if (pendingPhotos.length >= MAX_SCAN_IMAGES) {
      setOutcome({ kind: "error", message: TOO_MANY });
      return;
    }
    try {
      const photo = await cameraRef.current?.capture();
      if (!photo) return;
      setPendingPhotos((prev) => (prev.length >= MAX_SCAN_IMAGES ? prev : [...prev, photo]));
    } catch (error) {
      setOutcome({ kind: "error", message: error instanceof Error ? error.message : "The camera didn't return a photo." });
    }
  }

  /** Photo library: multi-select, append (capped at the max), then go straight to review. */
  async function pickFromLibrary(): Promise<void> {
    if (busy) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setOutcome({ kind: "error", message: "Photo library access is needed to pick a card photo." });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true });
    if (result.canceled || !result.assets?.length) return;
    const room = MAX_SCAN_IMAGES - pendingPhotos.length;
    if (room <= 0) {
      setOutcome({ kind: "error", message: TOO_MANY });
      return;
    }
    // Dimensions can be 0 when the library doesn't report them; those photos
    // skip the crop step (guarded in the strip) but still scan fine.
    const picked = result.assets
      .slice(0, room)
      .map((asset) => ({ uri: asset.uri, width: asset.width, height: asset.height }));
    setPendingPhotos((prev) => [...prev, ...picked].slice(0, MAX_SCAN_IMAGES));
    setReviewing(true);
  }

  /** Camera "Done": leave the preview for the crop-strip review, if anything was shot. */
  function reviewPending(): void {
    if (pendingPhotos.length > 0) setReviewing(true);
  }

  /** Strip: drop one photo; emptying the strip returns to the camera. */
  function removePendingPhoto(index: number): void {
    const next = pendingPhotos.filter((_, i) => i !== index);
    setPendingPhotos(next);
    if (next.length === 0) setReviewing(false);
  }

  /** Strip: replace one photo with its cropped version (no scan yet). */
  function cropPendingPhoto(index: number, cropped: CapturedPhoto): void {
    setPendingPhotos((prev) => prev.map((photo, i) => (i === index ? cropped : photo)));
  }

  /** Strip "Cancel": discard the batch and return to the camera. */
  function cancelReview(): void {
    setPendingPhotos([]);
    setReviewing(false);
  }

  /** Strip "Scan": run every pending photo through the OCR/image pipeline as one
   * merged capture, then submit. Holds `busy` across the whole pipeline so a
   * second trigger can't start a concurrent capture before this one resolves. */
  async function scanPending(): Promise<void> {
    if (busy || pendingPhotos.length === 0) return;
    const uris = pendingPhotos.map((photo) => photo.uri);
    setPendingPhotos([]);
    setReviewing(false);
    setBusy(true);
    try {
      const payload = await buildScanPayload(uris);
      await finish(payload.request, payload.path);
    } catch (error) {
      setOutcome({ kind: "error", message: error instanceof Error ? error.message : "Couldn't process those photos." });
      setBusy(false);
    }
  }

  return {
    cameraRef,
    pendingPhotos,
    reviewing,
    shootCamera,
    pickFromLibrary,
    reviewPending,
    removePendingPhoto,
    cropPendingPhoto,
    cancelReview,
    scanPending,
  };
}
