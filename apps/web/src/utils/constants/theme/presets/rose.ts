import type { ThemePreset } from "./types";

/**
 * Rose — a pink ground and accent. Like every hued preset it keeps Dhaga's
 * structure: the accent FILL is a light tint in both modes with a near-black
 * `onAccent` on top, while `ember` (accent TEXT) splits — the light tint on the
 * dark ground, a deep shade on the light ground. That split is the whole reason
 * globals.css separates amber from ember, and a hue swap must not undo it.
 */
export const ROSE_PRESET: ThemePreset = {
  id: "rose",
  label: "Rose",
  description: "Soft pink ground with a rose accent.",
  palettes: {
    light: {
      ink: "#fdf2f7",
      panel: "#ffffff",
      panel2: "#f7e2eb",
      seam: "#edc8d8",
      line: "#a8788c",
      paper: "#2a1620",
      fog: "#7a5566",
      amber: "#f7a8c4",
      amberLift: "#ffc9dc",
      amberSink: "#e87ba4",
      ember: "#8f2a52",
      well: "#f7e2eb",
      onAccent: "#2a1620",
      wash: "#2a1620",
      shadowCast: "rgba(80, 40, 58, 0.22)",
      shadowCastSoft: "rgba(80, 40, 58, 0.16)",
      destructive: "#b91c1c",
      input: "#a8788c",
    },
    dark: {
      ink: "#14090e",
      panel: "#1e1017",
      panel2: "#2a161f",
      seam: "#3d2130",
      line: "#8a5f72",
      paper: "#fbeaf1",
      fog: "#c39aab",
      amber: "#f7a8c4",
      amberLift: "#ffc9dc",
      amberSink: "#e87ba4",
      ember: "#f7a8c4",
      well: "#0d0609",
      onAccent: "#14090e",
      wash: "#fbeaf1",
      shadowCast: "rgba(0, 0, 0, 0.65)",
      shadowCastSoft: "rgba(0, 0, 0, 0.5)",
      destructive: "#ff8a8a",
      input: "#8a5f72",
    },
  },
};
