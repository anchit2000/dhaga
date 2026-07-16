"use client";

import { useState } from "react";
import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "../../canvas/use-is-mobile";
import { LayersContent } from "./LayersContent";
import type { CircleOption } from "../../logic/circles";
import type { GraphNodeType, LayerKey } from "../../types";

export interface LayersPanelProps {
  nodeTypes: readonly GraphNodeType[];
  hiddenLayers: ReadonlySet<LayerKey>;
  onToggleLayer: (key: LayerKey) => void;
  circles: readonly CircleOption[];
  circleIds: ReadonlySet<string>;
  onToggleCircle: (nodeId: string) => void;
  /** Tag layer is lazy-loaded: spinner on the Tags row while it fetches. */
  tagsLoading: boolean;
  /** False until the tag layer merges — tag circles only exist after that. */
  tagsReady: boolean;
  /** True when the server withheld spokes (pair count over the edge budget)
   *  — the tags section explains that spokes load per tag on selection. */
  tagsTruncated: boolean;
  /** True when the server capped the hub list (GRAPH_TAG_HUB_CAP) — the tags
   *  section says how many of the floor-surviving hubs are shown. */
  tagsHubsTruncated: boolean;
  /** Floor-surviving hub total server-side ("Showing the … of N"). */
  tagsTotalHubs: number;
}

/** Collapsible layers + circles panel: floating card on desktop, Sheet on mobile. */
export function LayersPanel(props: LayersPanelProps): React.ReactElement {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button variant="outline" size="sm" className="pointer-events-auto h-9 px-3" />
          }
        >
          <Layers aria-hidden />
          Layers
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Layers & circles</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6">
            <LayersContent {...props} />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="pointer-events-auto w-60">
      <Button
        variant="outline"
        size="sm"
        className="h-9 px-3"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Layers aria-hidden />
        Layers
      </Button>
      {open ? (
        <div className="mt-2 rounded-xl border border-seam bg-panel/95 p-3 shadow-lg backdrop-blur">
          <LayersContent {...props} />
        </div>
      ) : null}
    </div>
  );
}
