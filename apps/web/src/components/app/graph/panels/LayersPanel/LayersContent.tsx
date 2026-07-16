"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  GRAPH_MAX_ENABLED_CIRCLES,
  GRAPH_NODE_COLORS,
  GRAPH_TAG_HUB_CAP,
} from "@/utils/constants/graph";
import type { CircleOption } from "../../logic/circles";
import type { GraphNodeType, LayerKey } from "../../types";

const BUILT_IN_LAYERS: { key: LayerKey; label: string; color: string }[] = [
  { key: "contact", label: "People", color: GRAPH_NODE_COLORS.contact },
  { key: "company", label: "Companies", color: GRAPH_NODE_COLORS.company },
  { key: "event", label: "Events", color: GRAPH_NODE_COLORS.event },
  { key: "tag", label: "Tags", color: GRAPH_NODE_COLORS.tag },
];

/** One search box filters both the type toggles and the circle list — the
 *  layers panel and the "type multi-select" are the same visibility state. */
export function LayersContent({
  nodeTypes,
  hiddenLayers,
  onToggleLayer,
  circles,
  circleIds,
  onToggleCircle,
  tagsLoading,
  tagsReady,
  tagsTruncated,
  tagsHubsTruncated,
  tagsTotalHubs,
}: {
  nodeTypes: readonly GraphNodeType[];
  hiddenLayers: ReadonlySet<LayerKey>;
  onToggleLayer: (key: LayerKey) => void;
  circles: readonly CircleOption[];
  circleIds: ReadonlySet<string>;
  onToggleCircle: (nodeId: string) => void;
  tagsLoading: boolean;
  tagsReady: boolean;
  tagsTruncated: boolean;
  tagsHubsTruncated: boolean;
  tagsTotalHubs: number;
}): React.ReactElement {
  const [filter, setFilter] = useState("");
  const normalized = filter.trim().toLowerCase();
  const matches = (label: string): boolean => !normalized || label.toLowerCase().includes(normalized);

  const layers = [
    ...BUILT_IN_LAYERS,
    ...nodeTypes.map((type) => ({ key: type.id as LayerKey, label: type.name, color: type.color })),
  ].filter((layer) => matches(layer.label));
  const circleRows = circles.filter((circle) => matches(circle.label));
  const atCap = circleIds.size >= GRAPH_MAX_ENABLED_CIRCLES;

  // Server-side tag bounds, in one line: the hub cap ("Showing the 3,000
  // largest tags of N.") and/or withheld spokes (click-to-load).
  const tagNotice = [
    tagsHubsTruncated
      ? `Showing the ${GRAPH_TAG_HUB_CAP.toLocaleString()} largest tags of ${tagsTotalHubs.toLocaleString()}.`
      : null,
    tagsTruncated
      ? tagsHubsTruncated
        ? "Click a tag to load its people."
        : "Large tag graph — click a tag to load its people."
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-3">
      <Input
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Filter types & circles…"
        aria-label="Filter layer types and circles"
        className="h-8 text-sm"
      />
      <div className="space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-widest text-fog">Layers</p>
        {layers.map((layer) => (
          <label key={layer.key} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-1 hover:bg-wash/[0.04]">
            <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: layer.color }} />
            <span className="flex-1 truncate text-sm text-paper">{layer.label}</span>
            {layer.key === "tag" && tagsLoading ? (
              <Loader2 aria-hidden className="size-3.5 animate-spin text-fog" />
            ) : null}
            <Switch
              size="sm"
              checked={!hiddenLayers.has(layer.key)}
              onCheckedChange={() => onToggleLayer(layer.key)}
              aria-label={`Show ${layer.label}`}
            />
          </label>
        ))}
        {tagNotice && tagsReady && !hiddenLayers.has("tag") ? (
          <p className="px-1 text-xs text-fog">{tagNotice}</p>
        ) : null}
      </div>
      {circleRows.length > 0 || !tagsReady ? (
        <div className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fog">
            Circles · {circleIds.size}/{GRAPH_MAX_ENABLED_CIRCLES}
          </p>
          {!tagsReady ? (
            <p className="px-1 text-xs text-fog">
              {tagsLoading ? "Loading tags…" : "Turn on the Tags layer to add tag circles."}
            </p>
          ) : null}
          <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
            {circleRows.map((circle) => {
              const enabled = circleIds.has(circle.id);
              return (
                <label
                  key={circle.id}
                  className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-1 hover:bg-wash/[0.04]"
                >
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ backgroundColor: GRAPH_NODE_COLORS[circle.kind] }}
                  />
                  <span className="flex-1 truncate text-sm text-paper">{circle.label}</span>
                  <span className="font-mono text-[10px] text-fog">{circle.memberCount}</span>
                  <Switch
                    size="sm"
                    checked={enabled}
                    disabled={!enabled && atCap}
                    onCheckedChange={() => onToggleCircle(circle.id)}
                    aria-label={`Show circle for ${circle.label}`}
                  />
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
