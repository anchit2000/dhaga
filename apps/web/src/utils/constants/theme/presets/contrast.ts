import type { ThemePreset } from "./types";

/**
 * High contrast — pure #000/#fff grounds, borders heavy enough to define a
 * panel on their own (the grounds themselves barely differ), and a
 * high-luminance yellow accent. Every pair here clears AA with a wide margin
 * and most clear AAA; this is the preset for low-vision users, glare, and
 * projectors, so headroom matters more than restraint.
 */
export const CONTRAST_PRESET: ThemePreset = {
  id: "contrast",
  label: "High contrast",
  description: "Pure black and white grounds, heavy borders, a loud accent.",
  palettes: {
    light: {
      ink: "#ffffff",
      panel: "#ffffff",
      panel2: "#ebebeb",
      seam: "#9c9c9c",
      line: "#333333",
      paper: "#000000",
      fog: "#333333",
      amber: "#ffd400",
      amberLift: "#ffe45c",
      amberSink: "#e6bf00",
      ember: "#5c4500",
      well: "#ebebeb",
      onAccent: "#000000",
      wash: "#000000",
      shadowCast: "rgba(0, 0, 0, 0.35)",
      shadowCastSoft: "rgba(0, 0, 0, 0.22)",
      destructive: "#a30000",
      input: "#333333",
    },
    dark: {
      ink: "#000000",
      panel: "#0a0a0a",
      panel2: "#161616",
      seam: "#4d4d4d",
      line: "#b3b3b3",
      paper: "#ffffff",
      fog: "#e6e6e6",
      amber: "#ffd400",
      amberLift: "#ffe45c",
      amberSink: "#f0c800",
      ember: "#ffd400",
      well: "#000000",
      onAccent: "#000000",
      wash: "#ffffff",
      shadowCast: "rgba(0, 0, 0, 0.8)",
      shadowCastSoft: "rgba(0, 0, 0, 0.6)",
      destructive: "#ff9c9c",
      input: "#b3b3b3",
    },
  },
};
