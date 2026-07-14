import type { RefObject } from "react";
import { Textarea } from "@/components/ui/textarea";
import { PhotoCropper } from "../PhotoCropper";
import { SubmitButton } from "../SubmitButton";
import { PhotoCaptureInput } from "./PhotoCaptureInput";
import { QuickAddDock } from "./QuickAddDock";

type Mode = "paste" | "photo";

/** Mode toggle + paste/photo forms + inline dock + crop review, shared by the
 *  home dock's expanded state and the standalone /app/quick-add page. */
export function CaptureForm({
  mode,
  setMode,
  formAction,
  storeCardPhotos,
  pasteTextareaRef,
  photoToCrop,
  setPhotoToCrop,
  error,
  notice,
  captureOpen,
  onCaptureToggle,
}: {
  mode: Mode;
  setMode: (mode: Mode) => void;
  formAction: (formData: FormData) => void;
  storeCardPhotos: boolean;
  pasteTextareaRef: RefObject<HTMLTextAreaElement | null>;
  photoToCrop: File | null;
  setPhotoToCrop: (file: File | null) => void;
  error?: string;
  notice?: string;
  captureOpen: boolean;
  onCaptureToggle?: () => void;
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
        <form action={formAction} className="space-y-4">
          <PhotoCaptureInput storeCardPhotos={storeCardPhotos} onPhotoSelected={setPhotoToCrop} />
          <SubmitButton>Scan card</SubmitButton>
        </form>
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
      />

      {photoToCrop ? (
        <PhotoCropper
          file={photoToCrop}
          onCancel={() => setPhotoToCrop(null)}
          onConfirm={(cropped) => {
            setPhotoToCrop(null);
            const formData = new FormData();
            formData.set("photo", cropped);
            formAction(formData);
          }}
        />
      ) : null}
    </div>
  );
}
