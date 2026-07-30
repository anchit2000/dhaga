"use client";

import { useState, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import { ImagePlus } from "lucide-react";
import { MAX_CARD_IMAGES } from "@/utils/constants/app";
import { ImageTray } from "../ImageTray";
import { PhotoCropper } from "../PhotoCropper";
import { addToTray, moveInTray, removeFromTray, replaceInTray } from "../photoTray";

/**
 * The photo half of the note composer: the tray of attached photos plus its
 * crop dialog. Renders nothing until a photo is attached, so the composer stays
 * a plain textarea for the (far commoner) typed note.
 *
 * Reuses the card scan's tray and cropper deliberately — a photo note carries
 * the same thing (an ordered set of images of one subject) and the order is
 * likewise the order they get transcribed in.
 */
export function NotePhotoTray({
  photos,
  setPhotos,
}: {
  photos: File[];
  setPhotos: Dispatch<SetStateAction<File[]>>;
}) {
  const [cropIndex, setCropIndex] = useState<number | null>(null);
  if (photos.length === 0) return null;
  return (
    <>
      <ImageTray
        files={photos}
        max={MAX_CARD_IMAGES}
        subject="this note"
        onRemove={(index) => setPhotos((prev) => removeFromTray(prev, index))}
        onMoveLeft={(index) => setPhotos((prev) => moveInTray(prev, index, -1))}
        onMoveRight={(index) => setPhotos((prev) => moveInTray(prev, index, 1))}
        onCrop={(index) => setCropIndex(index)}
      />
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
    </>
  );
}

/**
 * The "Photo" affordance, sitting in the composer's button row next to the mic
 * so photo reads as a third way to capture a note, not a separate flow.
 *
 * A label wrapping a hidden file input rather than a button: `accept="image/*"`
 * gets the camera on a phone and the file picker on a desktop with no extra UI
 * of ours. No LinkedIn-QR pre-check here (unlike the card scan) — a photo note
 * is about what the photo SAYS, not about who it identifies.
 */
export function NotePhotoButton({
  photos,
  setPhotos,
  disabled = false,
}: {
  photos: File[];
  setPhotos: Dispatch<SetStateAction<File[]>>;
  disabled?: boolean;
}) {
  const full = photos.length >= MAX_CARD_IMAGES;
  const off = disabled || full;

  function onInputChange(event: ChangeEvent<HTMLInputElement>): void {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (files.length > 0) setPhotos((prev) => addToTray(prev, files, MAX_CARD_IMAGES));
  }

  return (
    <label
      aria-disabled={off}
      title={full ? `Up to ${MAX_CARD_IMAGES} photos per note.` : undefined}
      className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border border-seam px-3 py-2 text-xs text-fog transition-colors hover:text-paper ${
        off ? "pointer-events-none opacity-60" : ""
      }`}
    >
      <ImagePlus className="size-3.5" />
      {photos.length > 0 ? "Add another photo" : "Photo note"}
      <input
        type="file"
        name="notePhoto"
        accept="image/*"
        multiple
        disabled={off}
        className="sr-only"
        onChange={onInputChange}
      />
    </label>
  );
}
