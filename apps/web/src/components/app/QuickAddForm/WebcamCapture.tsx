"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Live in-browser webcam capture (getUserMedia) for the multi-image card tray.
 * Unlike the OS file picker, this lets a DESKTOP user shoot a card — and shoot
 * SEVERAL frames (front, back, extra pages) in one sitting: every Capture
 * pushes a frame into the tray via `onCapture` and the preview stays live for
 * the next shot. "Done" closes. The stream is always torn down on unmount.
 * Permission-denied / no-camera degrade to a message + a fallback to the file
 * upload the tray already offers (via onClose, which reveals the dropzone).
 */
export function WebcamCapture({
  onCapture,
  onClose,
  count,
  max,
  onDone,
}: {
  /** Called once per captured frame; the caller appends it to the image tray. */
  onCapture: (file: File) => void;
  /** Cancel/close the camera (top-right ✕ or the file-upload fallback). */
  onClose: () => void;
  /** Confirm the captured frames (the "Done" button). Falls back to onClose
   *  when absent — callers with a persistent tray (CardPhotoCapture) just close;
   *  the dock passes this to submit the frames it accumulated. */
  onDone?: () => void;
  /** Current tray size — drives the live n/max badge and the full state. */
  count: number;
  /** MAX_CARD_IMAGES — capture is disabled once the tray is full. */
  max: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Lazy init (not setState-in-effect): the no-camera message is knowable at
  // mount from the platform API, so it doesn't need a render-triggering effect.
  const [error, setError] = useState<string | null>(() =>
    typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function"
      ? null
      : "This browser can't open a live camera. Choose a photo file instead.",
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const media = navigator.mediaDevices;
    if (typeof media?.getUserMedia !== "function") return;
    media
      .getUserMedia({ video: { facingMode: "environment", width: { ideal: 1600 } } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setReady(true);
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "Couldn't access the camera — check your browser's camera permission, or choose a photo file instead.",
          );
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const full = count >= max;

  function capture(): void {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || full) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(new File([blob], `card-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <div className="dark fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-ink/95 p-4">
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        onClick={onClose}
        aria-label="Close camera"
        className="absolute right-4 top-4 size-11"
      >
        <X className="size-5" />
      </Button>

      {error ? (
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <p className="text-sm text-fog">{error}</p>
          <Button type="button" size="lg" onClick={onClose}>
            Choose a photo instead
          </Button>
        </div>
      ) : (
        <>
          <p className="max-w-sm text-center text-sm text-fog">
            Front, back, extra pages — capture each; they merge into one contact.
          </p>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="max-h-[60vh] w-full max-w-xl rounded-2xl border border-seam bg-panel object-contain"
          />
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="font-mono text-xs text-fog">
              {count}/{max}
            </span>
            <Button type="button" size="lg" onClick={capture} disabled={!ready || full}>
              <Camera className="size-5" />
              {full ? "Tray full" : "Capture"}
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={onDone ?? onClose}>
              <Check className="size-5" />
              {count > 0 ? `Done (${count})` : "Done"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
