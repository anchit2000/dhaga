"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";

/** Live in-browser webcam capture (getUserMedia) for scanning a card without an OS file picker. */
export function WebcamCapture({
  onCapture,
  onClose,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1600 } } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't access the camera — check your browser's camera permission.");
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function capture(): void {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(new File([blob], "card.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-ink/95 p-4">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close camera"
        className="absolute right-4 top-4 rounded-full border border-seam p-2 text-fog hover:text-paper"
      >
        <X className="size-5" />
      </button>

      {error ? (
        <p className="max-w-sm text-center text-sm text-fog">{error}</p>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="max-h-[70vh] w-full max-w-xl rounded-2xl border border-seam bg-panel object-contain"
          />
          <button
            type="button"
            onClick={capture}
            className="flex items-center gap-2 rounded-full bg-amber px-6 py-3 font-medium text-ink transition-opacity hover:opacity-90"
          >
            <Camera className="size-5" />
            Capture card
          </button>
        </>
      )}
    </div>
  );
}
