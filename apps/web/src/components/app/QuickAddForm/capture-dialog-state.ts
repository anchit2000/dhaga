import type { QuickAddState } from "@/lib/actions/quick-add";

export interface CaptureDialogState {
  /** The review "Save person" step is showing (a parsed contact, undismissed). */
  resultOpen: boolean;
  /**
   * On the home dock a camera/upload scan submits with the capture dialog CLOSED,
   * so a returned `{ error }` would render inside that closed dialog and vanish —
   * the silent bounce back to home with no contact and no error. When the current
   * (undismissed) action is an error, force the capture dialog open so its
   * FormError is visible. Off the home dock the dialog is always mounted/visible,
   * so this stays false there.
   */
  captureErrorOpen: boolean;
}

/**
 * Derive which capture surface is open from the action result (not
 * setState-in-an-effect). Each action returns a fresh state object, so a
 * per-result dismissal token (`dismissed`) lets the user close a surface while a
 * later scan — a new object — re-opens it.
 */
export function captureDialogState(
  state: QuickAddState,
  dismissed: QuickAddState | undefined,
  homeDock: boolean,
): CaptureDialogState {
  const undismissed = state !== dismissed;
  return {
    resultOpen: Boolean(state.contact) && undismissed,
    captureErrorOpen: homeDock && Boolean(state.error) && undismissed,
  };
}
