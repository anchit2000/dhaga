/**
 * The capture panel's tab model, kept as pure data so the default and the
 * mode → surface mapping are testable without rendering (mirrors
 * capture-dialog-state.ts). The component consumes these directly, so a change
 * to the default or the pill set moves behaviour and the test together.
 */
export type CaptureMode = "manual" | "paste" | "photo";

export interface CaptureModeOption {
  mode: CaptureMode;
  label: string;
}

/**
 * The pill strip, in display order. Manual leads: it's the free, no-AI path
 * that works without an API key, so it's the surface every capture entry point
 * opens on.
 */
export const CAPTURE_MODES: readonly CaptureModeOption[] = [
  { mode: "manual", label: "Manual" },
  { mode: "paste", label: "Paste text" },
  { mode: "photo", label: "Card photo" },
];

/** The tab the capture panel opens on. */
export const DEFAULT_CAPTURE_MODE: CaptureMode = "manual";

/**
 * True when the manual (blank ContactForm) hub should show instead of the AI
 * capture surface (paste textarea / card-photo tray). Selecting any other pill
 * swaps to the capture surface; selecting Manual (or closing the dialog, which
 * resets to {@link DEFAULT_CAPTURE_MODE}) restores it.
 */
export function showsManualSurface(mode: CaptureMode): boolean {
  return mode === "manual";
}
