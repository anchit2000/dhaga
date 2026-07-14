"use client";

import { useRef, useState, type RefObject } from "react";
import { Camera, Loader2, Mic, Square, Upload, UserPlus } from "lucide-react";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Dock, type DockItemData } from "@/components/ui/dock";
import { PhotoCropper } from "../PhotoCropper";
import { WebcamCapture } from "../WebcamCapture";
import { downscalePhoto } from "../downscalePhoto";
import { useDictation } from "../contact/useDictation";
import { DictationProgress } from "../contact/DictationProgress";

/**
 * Floating quick-add dock: voice dictation, live webcam capture, and file
 * upload all converge on the same review screen as the paste/photo forms —
 * voice and the file-upload photo path both call `onSubmitPhoto`/dictate into
 * the shared textarea rather than opening a separate flow.
 */
export function QuickAddDock({
  formAction,
  onVoiceStart,
  pasteTextareaRef,
  captureOpen = false,
  onCaptureToggle,
  floating = true,
}: {
  formAction: (formData: FormData) => void;
  onVoiceStart: () => void;
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
  const [photoToCrop, setPhotoToCrop] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    supported: dictationSupported,
    listening,
    transcribing,
    loadingProgress,
    partialText,
    start,
    stop,
  } = useDictation((text) => {
    const el = pasteTextareaRef.current;
    if (!el) return;
    el.value = el.value ? `${el.value.replace(/\s+$/, "")} ${text}` : text;
  });
  const dictationBusy = transcribing || loadingProgress !== null;

  function submitPhoto(file: File): void {
    void downscalePhoto(file).then((downscaled) => {
      const formData = new FormData();
      formData.set("photo", downscaled);
      formAction(formData);
    });
  }

  const items: DockItemData[] = [
    ...(dictationSupported
      ? [
          {
            icon: dictationBusy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : listening ? (
              <Square className="size-4" />
            ) : (
              <Mic className="size-4" />
            ),
            label: dictationBusy ? "Loading" : listening ? "Stop" : "Voice",
            active: listening,
            onClick: () => {
              if (dictationBusy) return;
              if (listening) {
                stop();
                return;
              }
              onVoiceStart();
              start();
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
        <WebcamCapture
          onCapture={(file) => {
            setShowCamera(false);
            setPhotoToCrop(file);
          }}
          onClose={() => setShowCamera(false)}
        />
      ) : null}
      {photoToCrop ? (
        <PhotoCropper
          file={photoToCrop}
          onCancel={() => setPhotoToCrop(null)}
          onConfirm={(cropped) => {
            setPhotoToCrop(null);
            submitPhoto(cropped);
          }}
        />
      ) : null}
      <div
        className={
          floating
            ? "pointer-events-none fixed inset-x-0 bottom-6 z-30 flex flex-col items-center gap-2 px-4"
            : "flex flex-col items-center gap-2"
        }
      >
        {dictationBusy ? (
          <div className={`rounded-full border border-seam bg-panel px-3 py-1 ${floating ? "pointer-events-auto" : ""}`}>
            <DictationProgress loadingProgress={loadingProgress} transcribing={transcribing} partialText={partialText} />
          </div>
        ) : null}
        <GlassSurface
          width="fit-content"
          height={88}
          borderRadius={28}
          backgroundOpacity={0.35}
          className={`px-1 ${floating ? "pointer-events-auto" : ""}`}
        >
          <Dock items={items} />
        </GlassSurface>
      </div>
    </>
  );
}
