import type { ThemePreset } from "./types";

/**
 * Monochrome — no hue anywhere. Dark is a near-black ground with white text;
 * light is a white ground with near-black text. The accent is a mid grey, so
 * the primary button stops being the loudest thing on the screen.
 *
 * The accent inverts between modes on purpose: on a near-black ground a light
 * grey fill with black text reads as the emphasis, on a white ground a
 * near-black fill with white text does. Same token, opposite polarity.
 */
export const MONO_PRESET: ThemePreset = {
  id: "mono",
  label: "Monochrome",
  description: "Plain black and white. No hue, quietest possible surface.",
  palettes: {
    light: {
      ink: "#f7f7f7",
      panel: "#ffffff",
      panel2: "#ebebeb",
      seam: "#dcdcdc",
      line: "#8a8a8a",
      paper: "#171717",
      fog: "#575757",
      amber: "#3f3f3f",
      amberLift: "#525252",
      amberSink: "#2b2b2b",
      ember: "#3f3f3f",
      well: "#f0f0f0",
      onAccent: "#ffffff",
      wash: "#171717",
      shadowCast: "rgba(0, 0, 0, 0.18)",
      shadowCastSoft: "rgba(0, 0, 0, 0.12)",
      destructive: "#b91c1c",
      input: "#8a8a8a",
    },
    dark: {
      ink: "#0a0a0a",
      panel: "#141414",
      panel2: "#1f1f1f",
      seam: "#2e2e2e",
      line: "#6b6b6b",
      paper: "#f5f5f5",
      fog: "#a3a3a3",
      amber: "#8f8f8f",
      amberLift: "#a0a0a0",
      amberSink: "#7f7f7f",
      ember: "#d4d4d4",
      well: "#050505",
      onAccent: "#000000",
      wash: "#f5f5f5",
      shadowCast: "rgba(0, 0, 0, 0.65)",
      shadowCastSoft: "rgba(0, 0, 0, 0.5)",
      destructive: "#f87171",
      input: "#6b6b6b",
    },
  },
};
