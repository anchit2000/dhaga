"use client";

import { useState } from "react";
import type { QuickAddState } from "@/lib/actions/quick-add";
import { captureDialogState } from "./capture-dialog-state";
import { DEFAULT_CAPTURE_MODE, type CaptureMode } from "./capture-mode";

export interface CaptureDialogController {
  /** The review "Save person" dialog is open (a parsed contact, undismissed). */
  resultOpen: boolean;
  /** A home-dock scan failed — the scan-error dialog should surface it. */
  captureErrorOpen: boolean;
  /** Mark the current result/error dismissed; close the dock's capture dialog. */
  dismissResult: () => void;
  /** Dismiss a failed dock scan and reopen capture on `next` so there's a way
   *  forward — reshoot on "photo", or type it in on the free "manual" tab. */
  reopenAfterScanError: (next: CaptureMode) => void;
  /** Dock dialog closed (✕ / backdrop): reset the tab and dismiss the result. */
  onDialogClose: () => void;
  /** Collapsed dock's Voice button: open the capture dialog on the paste tab. */
  onVoiceStart: () => void;
}

/**
 * The capture surfaces' open-state controller: derives which dialog is open
 * (review / scan-error) from the action result and owns the transitions between
 * them. Lifted out of QuickAddForm so that component stays a render orchestrator
 * under the 150-line rule; the pure derivation itself stays in
 * capture-dialog-state.ts. Every open-state is derived from the action result
 * (not setState-in-an-effect); a per-result dismissal token lets the user close
 * a surface while a later action — a new state object — re-opens it.
 */
export function useCaptureDialog(
  state: QuickAddState,
  homeDock: boolean,
  setMode: (mode: CaptureMode) => void,
  setCaptureOpen: (open: boolean) => void,
): CaptureDialogController {
  const [dismissed, setDismissed] = useState<QuickAddState | undefined>(undefined);
  const { resultOpen, captureErrorOpen } = captureDialogState(state, dismissed, homeDock);

  const dismissResult = (): void => {
    setDismissed(state);
    if (homeDock) setCaptureOpen(false);
  };
  const reopenAfterScanError = (next: CaptureMode): void => {
    setDismissed(state);
    setMode(next);
    setCaptureOpen(true);
  };
  const onDialogClose = (): void => {
    setMode(DEFAULT_CAPTURE_MODE);
    dismissResult();
  };
  const onVoiceStart = (): void => {
    setCaptureOpen(true);
    setMode("paste");
  };

  return { resultOpen, captureErrorOpen, dismissResult, reopenAfterScanError, onDialogClose, onVoiceStart };
}
