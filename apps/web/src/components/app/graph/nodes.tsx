"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export interface BrowserNodeData extends Record<string, unknown> {
  label: string;
  sublabel: string | null;
  href: string | null;
  /** Set only on cluster nodes (company/tag/location bubbles) — drives the count badge. */
  contactCount?: number | null;
  expanded?: boolean;
  pending?: boolean;
  /** Set on a person node deep-linked from a contact's profile — drives the focus glow. */
  highlighted?: boolean;
}

export interface OverflowNodeData extends Record<string, unknown> {
  label: string;
}

export type BrowserFlowNode = Node<BrowserNodeData, "person" | "company"> | Node<OverflowNodeData, "overflow">;

const hiddenHandle = { opacity: 0, width: 1, height: 1, border: 0 } as const;

function NodeHandles() {
  return (
    <>
      <Handle type="source" position={Position.Top} style={hiddenHandle} />
      <Handle type="target" position={Position.Top} style={hiddenHandle} />
    </>
  );
}

export function PersonGraphNode({ data }: NodeProps<Node<BrowserNodeData, "person">>) {
  const body = (
    <span className="flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1">
      <span
        className={
          data.highlighted
            ? "flex size-10 items-center justify-center rounded-full border-2 border-amber bg-amber/25 font-display text-sm text-amber shadow-[0_0_28px_-4px_rgba(226,164,76,1)]"
            : "flex size-10 items-center justify-center rounded-full border border-amber/40 bg-amber/15 font-display text-sm text-amber shadow-[0_0_18px_-6px_rgba(226,164,76,0.8)]"
        }
      >
        {data.label.charAt(0).toUpperCase()}
      </span>
      <span className="max-w-28 truncate rounded-full bg-ink/80 px-2 py-0.5 text-[10px] text-paper">
        {data.label}
      </span>
    </span>
  );
  return (
    <span className="relative block">
      <NodeHandles />
      {data.href ? <Link href={data.href}>{body}</Link> : body}
    </span>
  );
}

/**
 * Doubles as a cluster bubble (contactCount set, badge + chevron/spinner) and
 * an expanded company's hub anchor (contactCount nullish, plain label) — a
 * cluster and its expanded form are the same entity, not separate components.
 */
export function CompanyGraphNode({ data }: NodeProps<Node<BrowserNodeData, "company">>) {
  const isCluster = data.contactCount != null;
  return (
    <span className="relative block">
      <NodeHandles />
      <span className="relative block -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-seam bg-panel px-2.5 py-1.5 text-[11px] font-medium text-paper/90">
        <span className="flex items-center gap-1.5">
          {data.label}
          {isCluster ? (
            data.pending ? (
              <Loader2 className="size-3 shrink-0 animate-spin text-fog" aria-hidden />
            ) : data.expanded ? (
              <ChevronDown className="size-3 shrink-0 text-fog" aria-hidden />
            ) : (
              <ChevronRight className="size-3 shrink-0 text-fog" aria-hidden />
            )
          ) : null}
        </span>
        {isCluster ? (
          <span className="absolute -top-2 -right-2 flex min-w-4 items-center justify-center rounded-full bg-amber px-1 py-0.5 text-[9px] font-semibold text-ink">
            {data.contactCount}
          </span>
        ) : null}
      </span>
    </span>
  );
}

/** Non-interactive "+N more" pill for a cluster over the drill-down cap. */
export function OverflowGraphNode({ data }: NodeProps<Node<OverflowNodeData, "overflow">>) {
  return (
    <span className="relative block">
      <Handle type="target" position={Position.Top} style={hiddenHandle} />
      <span className="block -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-dashed border-seam/60 bg-panel/60 px-2 py-1 text-[10px] text-fog">
        {data.label}
      </span>
    </span>
  );
}
