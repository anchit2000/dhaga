"use client";

import Link from "next/link";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export interface BrowserNodeData extends Record<string, unknown> {
  label: string;
  sublabel: string | null;
  href: string | null;
}

export type BrowserFlowNode = Node<BrowserNodeData, "person" | "company">;

const hiddenHandle = { opacity: 0, width: 1, height: 1, border: 0 } as const;

function NodeHandles() {
  return (
    <>
      <Handle type="source" position={Position.Top} style={hiddenHandle} />
      <Handle type="target" position={Position.Top} style={hiddenHandle} />
    </>
  );
}

export function PersonGraphNode({ data }: NodeProps<BrowserFlowNode>) {
  const body = (
    <span className="flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1">
      <span className="flex size-10 items-center justify-center rounded-full border border-amber/40 bg-amber/15 font-display text-sm text-amber shadow-[0_0_18px_-6px_rgba(226,164,76,0.8)]">
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

export function CompanyGraphNode({ data }: NodeProps<BrowserFlowNode>) {
  return (
    <span className="relative block">
      <NodeHandles />
      <span className="block -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-seam bg-panel px-2.5 py-1.5 text-[11px] font-medium text-paper/90">
        {data.label}
      </span>
    </span>
  );
}
