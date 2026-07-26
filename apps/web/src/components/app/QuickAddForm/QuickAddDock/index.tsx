"use client";

import { useRef, useState, type RefObject } from "react";
import { Camera, Loader2, Mic, Square, Upload, UserPlus } from "lucide-react";
import { type DockItemData } from "@/components/ui/dock";
import { MAX_CARD_IMAGES } from "@/utils/constants/app";
import { PhotoCropper } from "../../PhotoCropper";
import { WebcamCapture } from "../WebcamCapture";
import { DockBar } from "./dock-bar";

/**
 * Floating quick-add dock: voice dictation, live webcam capture, and file
 * upload all converge on the same review screen as the paste/photo forms. Voice
 * is driven by the optional `voice` prop, owned by CaptureForm — it streams the
 * transcript live into the shared textarea and renders the tap-to-fix review
 * directly under it. Without a `voice` prop (the collapsed floating dock) the
 * Voice button just opens the capture dialog via `onVoiceStart`; it owns no mic.
 */
export function QuickAddDock({
  formAction,
  onVoiceStart,
  voice,
  pasteTextareaRef,
  captureOpen = false,
  onCaptureToggle,
  floating = true,
}: {
  formAction: (formData: FormData) => void;
  /** Opens the capture dialog when the dock owns no dictation (no `voice`). */
  onVoiceStart?: () => void;
  /** Dictation controls, owned by CaptureForm. Absent on the collapsed dock. */
  voice?: {
    supported: boolean;
    listening: boolean;
    transcribing: boolean;
    loadingProgress: number | null;
    start: () => void;
    stop: () => void;
  };
  pasteTextareaRef: RefObject<HTMLTextAreaElement | null>;
  captureOpen?: boolean;
  onCaptureToggle?: () => void;
  /** Fixed-to-viewport bottom bar (standalone page). Set false to render
   *  in-flow instead — needed inside the capture Dialog, whose CSS transform
   *  makes it the containing block for `fixed` descendants, which otherwise
   *  pins the dock to the dialog's own bottom edge and overlaps its content. */
  floating?: boolean;
}) {
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<File[]>([]);
  const [photoToCrop, setPhotoToCrop] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceBusy = voice ? voice.transcribing || voice.loadingProgress !== null : false;
  const voiceListening = voice?.listening ?? false;
  const showVoice = !voice || voice.supported;

  function submitPhotos(files: File[]): void {
    if (files.length === 0) return;
    // One FormData entry per image, all named `photo`; QuickAddForm's action
    // reducer downscales each before the request and the server merges them
    // into ONE contact — the same contract the Card-photo tab uses.
    const formData = new FormData();
    for (const file of files) formData.append("photo", file);
    formAction(formData);
  }

  const items: DockItemData[] = [
    ...(showVoice
      ? [
          {
            icon: voiceBusy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : voiceListening ? (
              <Square className="size-4" />
            ) : (
              <Mic className="size-4" />
            ),
            label: voiceBusy ? "Loading" : voiceListening ? "Stop" : "Voice",
            active: voiceListening,
            onClick: () => {
              // Collapsed dock owns no dictation — just open the dialog.
              if (!voice) {
                onVoiceStart?.();
                return;
              }
              if (voiceBusy) return;
              if (voiceListening) {
                voice.stop();
                return;
              }
              voice.start();
              requestAnimationFrame(() => pasteTextareaRef.current?.focus());
            },
          },
        ]
      : []),
    { icon: <Camera className="size-4" />, label: "Camera", onClick: () => setShowCamera(true) },
    { icon: <Upload className="size-4" />, label: "Upload", onClick: () => fileInputRef.current?.click() },
    ...(onCaptureToggle ? [{ icon: <UserPlus className="size-4" />, label: "Capture", active: captureOpen, onClick: onCaptureToggle }] : []),
  ];

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) setPhotoToCrop(file);
        }}
      />
      {showCamera ? (
        // Shoot several frames (front, back, extra pages) into a local tray,
        // then "Done" scans them together into ONE contact. ✕ discards.
        <WebcamCapture
          count={capturedPhotos.length}
          max={MAX_CARD_IMAGES}
          onCapture={(file) =>
            setCapturedPhotos((prev) => [...prev, file].slice(0, MAX_CARD_IMAGES))
          }
          onDone={() => {
            setShowCamera(false);
            submitPhotos(capturedPhotos);
            setCapturedPhotos([]);
          }}
          onClose={() => {
            setShowCamera(false);
            setCapturedPhotos([]);
          }}
        />
      ) : null}
      {photoToCrop ? (
        <PhotoCropper
          file={photoToCrop}
          onCancel={() => setPhotoToCrop(null)}
          onConfirm={(cropped) => {
            setPhotoToCrop(null);
            submitPhotos([cropped]);
          }}
        />
      ) : null}
      <DockBar
        floating={floating}
        items={items}
        dictationBusy={voiceBusy}
        loadingProgress={voice?.loadingProgress ?? null}
        transcribing={voice?.transcribing ?? false}
        partialText={null}
      />
    </>
  );
}
