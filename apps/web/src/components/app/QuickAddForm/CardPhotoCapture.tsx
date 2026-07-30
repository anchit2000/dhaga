"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { MAX_CARD_IMAGES } from "@/utils/constants/app";
import { addToTray, moveInTray, removeFromTray, replaceInTray } from "../photoTray";
import { PhotoCropper } from "../PhotoCropper";
import { PhotoCaptureInput } from "./PhotoCaptureInput";
import { ImageTray } from "../ImageTray";
import { WebcamCapture } from "./WebcamCapture";

/**
 * The "Card photo" mode: a unified multi-image tray. Users add photos (file
 * upload / OS picker / live webcam), reorder and remove them, optionally crop
 * each, then submit them all as ONE contact. Add-and-LinkedIn-QR-check lives in
 * PhotoCaptureInput; this component owns the tray state transitions and submit.
 */
export function CardPhotoCapture({
  storeCardPhotos,
  photos,
  setPhotos,
  pending,
  formAction,
}: {
  storeCardPhotos: boolean;
  photos: File[];
  setPhotos: Dispatch<SetStateAction<File[]>>;
  pending: boolean;
  formAction: (formData: FormData) => void;
}) {
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [cropIndex, setCropIndex] = useState<number | null>(null);

  function addPhotos(incoming: File[]): void {
    setPhotos((prev) => addToTray(prev, incoming, MAX_CARD_IMAGES));
  }

  function removeAt(index: number): void {
    setPhotos((prev) => removeFromTray(prev, index));
  }

  function move(index: number, delta: number): void {
    setPhotos((prev) => moveInTray(prev, index, delta));
  }

  function submitPhotos(): void {
    if (photos.length === 0) return;
    const formData = new FormData();
    // Contract: one FormData entry per image, all named `photo`; the server
    // reads getAll("photo") and merges them into one contact. Downscaling
    // happens per image in QuickAddForm's action reducer before the request.
    for (const file of photos) formData.append("photo", file);
    formAction(formData);
  }

  return (
    <div className="space-y-4">
      {photos.length > 0 ? (
        <ImageTray
          files={photos}
          max={MAX_CARD_IMAGES}
          onRemove={removeAt}
          onMoveLeft={(index) => move(index, -1)}
          onMoveRight={(index) => move(index, 1)}
          onCrop={(index) => setCropIndex(index)}
        />
      ) : null}
      <PhotoCaptureInput
        storeCardPhotos={storeCardPhotos}
        onPhotosSelected={addPhotos}
        onOpenWebcam={() => setWebcamOpen(true)}
        compact={photos.length > 0}
        disabled={photos.length >= MAX_CARD_IMAGES}
      />
      {photos.length > 0 ? (
        <Button type="button" className="w-full" loading={pending} onClick={submitPhotos}>
          {photos.length > 1 ? `Scan ${photos.length} images` : "Scan card"}
        </Button>
      ) : null}

      {webcamOpen ? (
        <WebcamCapture
          onCapture={(file) => addPhotos([file])}
          onClose={() => setWebcamOpen(false)}
          count={photos.length}
          max={MAX_CARD_IMAGES}
        />
      ) : null}

      {cropIndex !== null && photos[cropIndex] ? (
        <PhotoCropper
          file={photos[cropIndex]}
          onCancel={() => setCropIndex(null)}
          onConfirm={(cropped) => {
            setPhotos((prev) => replaceInTray(prev, cropIndex, cropped));
            setCropIndex(null);
          }}
        />
      ) : null}
    </div>
  );
}
