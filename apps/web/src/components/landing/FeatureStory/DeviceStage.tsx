"use client";

import dynamic from "next/dynamic";
import type { ReactElement } from "react";

import { AppPreviewNav } from "../AppWindow/DashboardPreview/nav";
import {
  AlertsPane,
  CapturePane,
  CirclesPane,
  DraftPane,
  SearchPane,
  VoicePane,
} from "./previews";
import { GRAPH_SCENES } from "@/utils/constants/landing/graph";
import type { StoryVisual } from "@/utils/constants/landing/story";

// The production Sigma renderer and its fixture stay out of the initial chunk.
// The frame height is reserved, so switching to Graph or Warm paths adds no CLS.
const GraphStage = dynamic(
  () => import("./GraphStage").then((mod) => mod.GraphStage),
  { ssr: false },
);

function graphScene(id: "graph" | "warmpath") {
  const scene = GRAPH_SCENES.find((candidate) => candidate.id === id);
  if (!scene) throw new Error(`Missing graph scene: ${id}`);
  return scene;
}

/** A fixture-driven crop of the shipping web app, never a conceptual device UI. */
export function DeviceStage({ visual }: { visual: StoryVisual }): ReactElement {
  return (
    <div className="overflow-hidden rounded-2xl border border-seam bg-ink shadow-[0_30px_80px_-45px_var(--shadow-cast)]">
      <AppPreviewNav />
      <div className="h-[360px] min-w-0 overflow-hidden sm:h-[400px]">
        <PreviewPane visual={visual} />
      </div>
    </div>
  );
}

function PreviewPane({ visual }: { visual: StoryVisual }): ReactElement {
  if (visual === "scan") return <CapturePane />;
  if (visual === "circles") return <CirclesPane />;
  if (visual === "voice") return <VoicePane />;
  if (visual === "search") return <SearchPane />;
  if (visual === "draft") return <DraftPane />;
  if (visual === "alerts") return <AlertsPane />;
  return (
    <GraphStage scene={graphScene(visual === "warmpath" ? "warmpath" : "graph")} />
  );
}
