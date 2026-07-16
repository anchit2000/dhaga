"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { AddRelationshipDialog } from "@/components/app/relationships/AddRelationshipDialog";
import { useIsMobile } from "../../canvas/use-is-mobile";
import { KindDot, kindLabel } from "../KindDot";
import { buildEdgeRows, EdgeList } from "./EdgeList";
import { TagHubSummary } from "./TagHubSummary";
import type { RelationshipLabelMap } from "@dhaga/core";
import type { GraphIndexes } from "../../logic/indexes";
import type { FullGraphNode, GraphNodeType } from "../../types";

const DETAIL_ROUTES: Partial<Record<FullGraphNode["kind"], string>> = {
  contact: "/app/people",
  event: "/app/events",
  entity: "/app/entities",
};

export function NodePanel({
  node,
  indexes,
  nodeTypes,
  labelMap,
  collapsedGroups,
  circleIds,
  onClose,
  onGoTo,
  onToggleCollapsed,
  onToggleCircle,
  onGraphChanged,
}: {
  node: FullGraphNode | null;
  indexes: GraphIndexes;
  nodeTypes: readonly GraphNodeType[];
  labelMap: RelationshipLabelMap;
  collapsedGroups: ReadonlySet<string>;
  circleIds: ReadonlySet<string>;
  onClose: () => void;
  onGoTo: (nodeId: string) => void;
  onToggleCollapsed: (groupId: string) => void;
  onToggleCircle: (nodeId: string) => void;
  onGraphChanged: () => void;
}): React.ReactElement | null {
  const isMobile = useIsMobile();

  const { incoming, outgoing } = useMemo(
    () => buildEdgeRows(node, indexes, labelMap),
    [node, indexes, labelMap],
  );

  if (!node) return null;

  const detailBase = DETAIL_ROUTES[node.kind];
  const isGroup = (node.kind === "company" || node.kind === "event") && indexes.groupMembers.has(node.id);
  const canCircle = node.kind === "event" || node.kind === "tag";

  return (
    <Sheet open onOpenChange={(open) => (open ? undefined : onClose())}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={isMobile ? "max-h-[75vh]" : undefined}
      >
        <SheetHeader>
          <div className="flex items-center gap-2">
            <KindDot node={node} nodeTypes={nodeTypes} />
            <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-widest">
              {kindLabel(node, nodeTypes)}
            </Badge>
          </div>
          <SheetTitle className="truncate pr-8 text-lg">{node.label}</SheetTitle>
          {node.sublabel ? <p className="truncate text-sm text-fog">{node.sublabel}</p> : null}
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-6">
          <div className="flex flex-wrap items-center gap-2">
            {detailBase ? (
              <Button variant="secondary" size="sm" className="h-9" render={<Link href={`${detailBase}/${node.id}`} />}>
                <ExternalLink aria-hidden />
                Open page
              </Button>
            ) : null}
            {node.kind !== "tag" ? (
              <AddRelationshipDialog
                sourceId={node.id}
                sourceKind={node.kind}
                sourceLabel={node.label}
                onCreated={onGraphChanged}
              />
            ) : null}
          </div>

          <TagHubSummary node={node} spokesShown={indexes.degree.get(node.id) ?? 0} />
          {isGroup ? (
            <label className="flex min-h-9 cursor-pointer items-center gap-2">
              <Switch
                size="sm"
                checked={collapsedGroups.has(node.id)}
                onCheckedChange={() => onToggleCollapsed(node.id)}
                aria-label="Collapse group"
              />
              <span className="text-sm text-paper">
                Collapse group · {indexes.groupMembers.get(node.id)?.size ?? 0} members
              </span>
            </label>
          ) : null}
          {canCircle ? (
            <label className="flex min-h-9 cursor-pointer items-center gap-2">
              <Switch
                size="sm"
                checked={circleIds.has(node.id)}
                onCheckedChange={() => onToggleCircle(node.id)}
                aria-label="Show circle"
              />
              <span className="text-sm text-paper">Show circle on canvas</span>
            </label>
          ) : null}

          <EdgeList title="Incoming" rows={incoming.rows} total={incoming.total} onGoTo={onGoTo} />
          <EdgeList title="Outgoing" rows={outgoing.rows} total={outgoing.total} onGoTo={onGoTo} />
          {incoming.total === 0 && outgoing.total === 0 ? (
            <p className="text-sm text-fog">No relationships yet.</p>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
