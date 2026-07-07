import { Feather } from "@expo/vector-icons";

import { type DockAction } from "@/components/bottom-dock";
import { COLORS } from "@/utils/constants";

import type { CaptureMode } from "./use-capture-flow";

interface BuildDockActionsArgs {
  mode: CaptureMode;
  onVoice: () => void;
  onCameraOrShutter: () => void;
  onFile: () => void;
}

/** Builds the three bottom-dock actions (voice, camera/shutter, file) for the capture screen. */
export function buildDockActions({ mode, onVoice, onCameraOrShutter, onFile }: BuildDockActionsArgs): DockAction[] {
  return [
    {
      key: "voice",
      icon: <Feather name="mic" size={20} color={mode === "text" ? COLORS.amber : COLORS.paper} />,
      label: "Voice",
      active: mode === "text",
      onPress: onVoice,
    },
    {
      key: "camera",
      icon: <Feather name="camera" size={20} color={mode === "camera" ? COLORS.amber : COLORS.paper} />,
      label: mode === "camera" ? "Shutter" : "Camera",
      active: mode === "camera",
      onPress: onCameraOrShutter,
    },
    {
      key: "file",
      icon: <Feather name="image" size={20} color={COLORS.paper} />,
      label: "File",
      onPress: onFile,
    },
  ];
}
