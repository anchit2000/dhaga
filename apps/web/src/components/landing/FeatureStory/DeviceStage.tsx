"use client";

import { Shell } from "../AppWindow/Shell";
import { PhoneShell } from "../devices/PhoneShell";
import { ScanScreen } from "../devices/ScanScreen";
import { AlertsScreen, IdleScreen, VoiceScreen } from "../devices/screens";
import { GraphStage } from "./GraphStage";
import { SearchPane } from "./panes";
import { DraftPane } from "./panes";
import { GRAPH_SCENES } from "@/utils/constants/landing/graph";
import { PHONE_VISUALS, type StoryVisual } from "@/utils/constants/landing/story";

function graphScene(id: string) {
  const scene = GRAPH_SCENES.find((s) => s.id === id);
  if (!scene) throw new Error(`Missing graph scene: ${id}`);
  return scene;
}

/**
 * The sticky stage: desktop window + overlapping phone.
 * The active visual decides which device comes forward; the other recedes.
 */
export function DeviceStage({ visual }: { visual: StoryVisual }) {
  const phoneActive = PHONE_VISUALS.includes(visual);

  return (
    <div className="relative">
      {/* desktop window */}
      <div
        className="relative transition-all duration-700"
        style={{
          zIndex: phoneActive ? 0 : 10,
          opacity: phoneActive ? 0.6 : 1,
          filter: phoneActive ? "saturate(0.5) brightness(0.75)" : "none",
          transform: phoneActive ? "scale(0.97) translateX(12px)" : "scale(1)",
        }}
      >
        <Shell className="ml-auto w-full max-w-xl">
          <DesktopPane visual={visual} />
        </Shell>
      </div>

      {/* phone: in front when a capture scene plays, tucked behind otherwise */}
      <div
        className="absolute -bottom-8 w-44 transition-all duration-700 sm:w-48"
        style={{
          zIndex: phoneActive ? 10 : 0,
          left: phoneActive ? "-0.5rem" : "-3.5rem",
          opacity: phoneActive ? 1 : 0.9,
          filter: phoneActive ? "none" : "saturate(0.5) brightness(0.6)",
          transform: phoneActive
            ? "scale(1.04) rotate(-2deg)"
            : "scale(0.9) rotate(-7deg) translateY(10px)",
        }}
      >
        <PhoneShell>
          <PhoneScreen visual={visual} />
        </PhoneShell>
      </div>
    </div>
  );
}

function DesktopPane({ visual }: { visual: StoryVisual }) {
  if (visual === "search") return <SearchPane />;
  if (visual === "draft") return <DraftPane />;
  const sceneId =
    visual === "circles" ? "circles" : visual === "warmpath" ? "warmpath" : "graph";
  return (
    <div className="h-[340px] min-w-0 flex-1">
      <GraphStage scene={graphScene(sceneId)} />
    </div>
  );
}

function PhoneScreen({ visual }: { visual: StoryVisual }) {
  if (visual === "scan") return <ScanScreen />;
  if (visual === "voice") return <VoiceScreen />;
  if (visual === "alerts") return <AlertsScreen />;
  return <IdleScreen />;
}
