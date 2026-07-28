import { describe, expect, it } from "vitest";
import type { ExtractedContact } from "@dhaga/core";
import type { QuickAddState } from "@/lib/actions/quick-add";
import { captureDialogState } from "./capture-dialog-state";

/**
 * The regression: on the home dock a camera/upload card scan submits with the
 * capture dialog CLOSED. A failing scan returns `{ error }`, but that error only
 * renders inside the capture dialog's CaptureForm — so with the dialog closed it
 * vanished and the user bounced back to home with no contact and no error. These
 * pin that a dock-scan error forces a visible surface (captureErrorOpen) while a
 * success opens the review step, and that neither leaks off the home dock.
 */
const contact: ExtractedContact = {
  name: "Ada Lovelace",
  title: null,
  company: null,
  emails: [],
  phones: [],
  links: [],
  location: null,
};

describe("captureDialogState", () => {
  it("forces the capture dialog open so a home-dock scan error is visible", () => {
    const state: QuickAddState = { error: "The scan failed." };
    const { resultOpen, captureErrorOpen } = captureDialogState(state, undefined, true);
    expect(captureErrorOpen).toBe(true); // error surfaces instead of a silent bounce
    expect(resultOpen).toBe(false);
  });

  it("opens the review step (not an error surface) on a successful scan", () => {
    const state: QuickAddState = { contact, via: "ai" };
    const { resultOpen, captureErrorOpen } = captureDialogState(state, undefined, true);
    expect(resultOpen).toBe(true);
    expect(captureErrorOpen).toBe(false);
  });

  it("keeps the forced error surface closeable via the dismissal token", () => {
    const state: QuickAddState = { error: "The scan failed." };
    // Dismissing stores the current state object; the same state is now dismissed.
    expect(captureDialogState(state, state, true).captureErrorOpen).toBe(false);
  });

  it("re-opens for a later scan (a fresh state object) after dismissal", () => {
    const dismissed: QuickAddState = { error: "The scan failed." };
    const next: QuickAddState = { error: "The scan failed." }; // same text, new object
    expect(captureDialogState(next, dismissed, true).captureErrorOpen).toBe(true);
  });

  it("never forces the capture dialog open off the home dock", () => {
    const state: QuickAddState = { error: "The scan failed." };
    expect(captureDialogState(state, undefined, false).captureErrorOpen).toBe(false);
  });
});
