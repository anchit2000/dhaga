import type { RefObject } from "react";

/** Dictation controls, owned by CaptureForm. Absent on the collapsed dock. */
export interface QuickAddDockVoice {
  supported: boolean;
  listening: boolean;
  transcribing: boolean;
  loadingProgress: number | null;
  start: () => void;
  stop: () => void;
}

export interface QuickAddDockProps {
  formAction: (formData: FormData) => void;
  /** Hands the camera's frames to the card-photo tray (crop / reorder / remove
   *  live there) instead of scanning them blind. */
  onPhotosCaptured: (files: File[]) => void;
  /** Opens the capture dialog when the dock owns no dictation (no `voice`). */
  onVoiceStart?: () => void;
  /** Dictation controls, owned by CaptureForm. Absent on the collapsed dock. */
  voice?: QuickAddDockVoice;
  pasteTextareaRef: RefObject<HTMLTextAreaElement | null>;
  captureOpen?: boolean;
  onCaptureToggle?: () => void;
  /** Fixed-to-viewport bottom bar (standalone page). Set false to render
   *  in-flow instead — needed inside the capture Dialog, whose CSS transform
   *  makes it the containing block for `fixed` descendants, which otherwise
   *  pins the dock to the dialog's own bottom edge and overlaps its content. */
  floating?: boolean;
}
