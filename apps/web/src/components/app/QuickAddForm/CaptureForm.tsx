"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "../SubmitButton";
import { CardPhotoCapture } from "./CardPhotoCapture";
import { QuickAddDock } from "./QuickAddDock";

type Mode = "paste" | "photo";

/** Mode toggle + paste form + multi-image card tray + inline dock, shared by
 *  the home dock's expanded state and the standalone /app/quick-add page. */
export function CaptureForm({
  mode,
  setMode,
  formAction,
  storeCardPhotos,
  pasteTextareaRef,
  photos,
  setPhotos,
  pending = false,
  error,
  notice,
  captureOpen,
  onCaptureToggle,
  inDialog = false,
}: {
  mode: Mode;
  setMode: (mode: Mode) => void;
  formAction: (formData: FormData) => void;
  storeCardPhotos: boolean;
  pasteTextareaRef: RefObject<HTMLTextAreaElement | null>;
  /** The card-image tray: several photos describing ONE contact. */
  photos: File[];
  setPhotos: Dispatch<SetStateAction<File[]>>;
  /** Extraction in flight — drives the multi-image "Scan" button's loading state. */
  pending?: boolean;
  error?: string;
  notice?: string;
  captureOpen: boolean;
  onCaptureToggle?: () => void;
  /** True when rendered inside the capture Dialog, where the dock must sit
   *  in-flow instead of floating (see QuickAddDock's `floating` prop). */
  inDialog?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        {(["paste", "photo"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              mode === option
                ? "border-amber/40 bg-amber/15 font-medium text-amber"
                : "border-seam text-fog hover:text-paper"
            }`}
          >
            {option === "paste" ? "Paste text" : "Card photo"}
          </button>
        ))}
      </div>

      {mode === "paste" ? (
        <form action={formAction} className="space-y-4">
          <Textarea
            ref={pasteTextareaRef}
            name="raw"
            required
            rows={8}
            placeholder={
              "Paste anything with a person in it —\nan email signature, card text, a LinkedIn intro… or tap Voice below and just talk."
            }
            className="font-mono text-sm"
          />
          <SubmitButton>Extract contact</SubmitButton>
        </form>
      ) : (
        <CardPhotoCapture
          storeCardPhotos={storeCardPhotos}
          photos={photos}
          setPhotos={setPhotos}
          pending={pending}
          formAction={formAction}
        />
      )}

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? <p className="text-sm text-fog">{notice}</p> : null}

      <QuickAddDock
        formAction={formAction}
        onVoiceStart={() => setMode("paste")}
        pasteTextareaRef={pasteTextareaRef}
        captureOpen={captureOpen}
        onCaptureToggle={onCaptureToggle}
        floating={!inDialog}
      />
    </div>
  );
}
