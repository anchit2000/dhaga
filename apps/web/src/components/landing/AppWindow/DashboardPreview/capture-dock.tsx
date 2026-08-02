import { Camera, Mic, Upload, UserPlus } from "lucide-react";

import { MOCK_CAPTURE_ACTIONS } from "@/utils/constants/landing";

export function CaptureDockPreview() {
  return (
    <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1 rounded-2xl border border-seam bg-panel-2/95 p-1.5 shadow-xl">
      {MOCK_CAPTURE_ACTIONS.map((label) => (
        <div key={label} className="flex min-w-10 flex-col items-center gap-0.5 text-[7px] text-fog">
          <span className="flex size-7 items-center justify-center rounded-full border border-seam">{captureIcon(label)}</span>
          {label}
        </div>
      ))}
    </div>
  );
}

function captureIcon(label: (typeof MOCK_CAPTURE_ACTIONS)[number]) {
  if (label === "Capture") return <UserPlus className="size-3" />;
  if (label === "Voice") return <Mic className="size-3" />;
  if (label === "Camera") return <Camera className="size-3" />;
  return <Upload className="size-3" />;
}
