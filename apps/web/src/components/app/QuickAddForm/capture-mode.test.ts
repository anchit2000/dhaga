import { describe, expect, it } from "vitest";
import {
  CAPTURE_MODES,
  DEFAULT_CAPTURE_MODE,
  showsManualSurface,
  type CaptureMode,
} from "./capture-mode";

/**
 * The behaviour under test: the capture panel now OPENS on Manual (the free,
 * no-AI, no-key path) rather than the AI paste form, and the three pills switch
 * between the manual hub and the AI capture surface. These pin that intent so a
 * regression to the old "paste is default" — or dropping/reordering the Manual
 * pill, or breaking the mode → surface mapping the pills drive — fails here.
 */
describe("capture-mode", () => {
  it("defaults the capture panel to the Manual tab", () => {
    // If someone flips the default back to an AI tab, this fails: Manual must be
    // the surface every entry point (home dock, nav, /app/quick-add) opens on.
    expect(DEFAULT_CAPTURE_MODE).toBe("manual");
    expect(showsManualSurface(DEFAULT_CAPTURE_MODE)).toBe(true);
  });

  it("leads the pill strip with Manual, then the AI capture modes", () => {
    expect(CAPTURE_MODES.map((option) => option.mode)).toEqual([
      "manual",
      "paste",
      "photo",
    ]);
    expect(CAPTURE_MODES.map((option) => option.label)).toEqual([
      "Manual",
      "Paste text",
      "Card photo",
    ]);
  });

  it("shows the manual hub only on the Manual tab, the capture surface on the rest", () => {
    // Switching pills = choosing a mode; only "manual" renders the blank-form
    // hub, "paste"/"photo" render the AI capture surface. Round-trips back too.
    expect(showsManualSurface("manual")).toBe(true);
    expect(showsManualSurface("paste")).toBe(false);
    expect(showsManualSurface("photo")).toBe(false);
  });

  it("exposes every pill as a distinct, valid mode", () => {
    const modes = CAPTURE_MODES.map((option) => option.mode);
    expect(new Set(modes).size).toBe(modes.length);
    const valid: CaptureMode[] = ["manual", "paste", "photo"];
    for (const mode of modes) expect(valid).toContain(mode);
  });
});
