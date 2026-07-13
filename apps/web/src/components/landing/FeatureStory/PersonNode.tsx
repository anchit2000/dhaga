"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Headshot } from "../Headshot";
import { GRAPH_FACTS, type GraphNode } from "@/utils/constants/landing/graph";
import { getPerson } from "@/utils/constants/landing/people";

export interface PersonData extends Record<string, unknown> {
  person: GraphNode;
  lit: boolean;
  dimmed: boolean;
  hidden: boolean;
  badge: boolean;
  draft: boolean;
  facts: boolean;
}

export type PersonFlowNode = Node<PersonData, "person">;

const handleStyle: React.CSSProperties = {
  left: 0,
  top: 0,
  transform: "none",
  opacity: 0,
  pointerEvents: "none",
  width: 1,
  height: 1,
  minWidth: 0,
  minHeight: 0,
  border: "none",
};

export function PersonNode({ data }: NodeProps<PersonFlowNode>) {
  const { person, lit, dimmed, hidden, badge, draft, facts } = data;
  return (
    <div
      className="transition-all duration-700"
      style={{
        opacity: hidden ? 0 : dimmed ? 0.3 : 1,
        transform: `scale(${hidden ? 0.2 : lit ? 1.1 : 1})`,
      }}
    >
      <Handle type="source" position={Position.Top} style={handleStyle} />
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <div className="relative flex -translate-x-1/2 -translate-y-1/2 cursor-grab flex-col items-center active:cursor-grabbing">
        <Headshot
          personId={person.id}
          glow={lit}
          className={person.big ? "size-14" : "size-10"}
        />
        {lit ? (
          <span className="absolute top-full mt-2 whitespace-nowrap rounded-full border border-seam bg-panel px-2.5 py-1 text-[10px] text-paper shadow">
            {person.big ? "You" : getPerson(person.id).name}
          </span>
        ) : null}
        {badge ? (
          <span className="absolute bottom-full mb-2 animate-pulse whitespace-nowrap rounded-full bg-amber px-2.5 py-1 text-[10px] font-semibold text-on-accent shadow-lg">
            Job change · Stripe → new co
          </span>
        ) : null}
        {draft ? (
          <span className="absolute bottom-full mb-2 whitespace-nowrap rounded-md border border-amber/50 bg-panel px-2.5 py-1.5 text-[10px] text-ember shadow-lg">
            Draft follow-up ✦
          </span>
        ) : null}
        {facts ? (
          <div className="absolute left-full top-0 ml-3 hidden w-40 space-y-1.5 sm:block">
            {GRAPH_FACTS.slice(0, 1).map((fact) => (
              <p key={fact} className="rounded-md border-l-2 border-amber bg-panel/95 px-2 py-1.5 text-[10px] leading-snug text-paper shadow">
                {fact}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export interface AnnotationData extends Record<string, unknown> {
  kind: "cluster" | "warmLabel";
  visible: boolean;
}

export type AnnotationFlowNode = Node<AnnotationData, "annotation">;

export function AnnotationNode({ data }: NodeProps<AnnotationFlowNode>) {
  if (data.kind === "cluster") {
    return (
      <div
        className="pointer-events-none h-[280px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-dashed border-amber/60 transition-opacity duration-700"
        style={{ opacity: data.visible ? 1 : 0 }}
      >
        <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] uppercase tracking-widest text-ember">
          Web Summit 2026 — auto-grouped
        </span>
      </div>
    );
  }
  return (
    <span
      className="pointer-events-none block -translate-x-1/2 -translate-y-1/2 -rotate-6 whitespace-nowrap font-mono text-[11px] text-ember transition-opacity duration-700"
      style={{ opacity: data.visible ? 1 : 0 }}
    >
      warm path → Aerolane
    </span>
  );
}
