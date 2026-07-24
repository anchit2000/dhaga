"use client";

import { useCallback, useEffect, useState } from "react";
import { buildGraphIndexes, type GraphIndexes } from "@/components/app/graph/logic/indexes";
import { SANDBOX_CORE_ASSET, SANDBOX_FULL_ASSET } from "@/utils/constants/landing";
import type { FullGraphEdge, FullGraphNode, FullGraphPayload, PositionMap } from "@/components/app/graph/types";

export type SandboxMode = "core" | "full";

export interface SandboxDataset {
  payload: FullGraphPayload;
  positions: PositionMap;
  indexes: GraphIndexes;
}

/** On-disk node shape emitted by scripts/export-public-graph.mjs: a FullGraphNode
 *  with baked x/y and null sublabels omitted to save bytes. */
interface BakedNode {
  id: string;
  kind: FullGraphNode["kind"];
  label: string;
  sublabel?: string;
  typeId?: string;
  x: number;
  y: number;
}

interface BakedPayload {
  nodes: BakedNode[];
  edges: FullGraphEdge[];
  nodeTypes: FullGraphPayload["nodeTypes"];
  relationshipTypes: FullGraphPayload["relationshipTypes"];
}

/** Fetch a baked asset and split it into the renderer's payload + a position
 *  map (positions come straight from the JSON — no runtime layout). */
async function loadDataset(url: string): Promise<SandboxDataset> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
  const raw = (await res.json()) as BakedPayload;

  const nodes: FullGraphNode[] = raw.nodes.map((n) => ({
    id: n.id,
    kind: n.kind,
    label: n.label,
    sublabel: n.sublabel ?? null,
    ...(n.typeId ? { typeId: n.typeId } : {}),
  }));
  const positions: PositionMap = new Map(raw.nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
  const payload: FullGraphPayload = {
    nodes,
    edges: raw.edges,
    nodeTypes: raw.nodeTypes,
    relationshipTypes: raw.relationshipTypes,
  };
  return { payload, positions, indexes: buildGraphIndexes(payload) };
}

export interface LandingGraphState {
  mode: SandboxMode;
  /** Active dataset for the current mode; null while the core asset loads. */
  dataset: SandboxDataset | null;
  error: string | null;
  /** The full set hasn't been swapped in yet — the explode CTA is meaningful. */
  explodable: boolean;
  exploding: boolean;
  explode: () => void;
}

/**
 * Owns the two on-demand assets. Core loads on mount; the full set loads only
 * when the visitor explodes, then the mode flip drives a keyed remount of the
 * renderer (a fresh sigma for the 21k set — never a live mutation).
 */
export function useLandingGraph(): LandingGraphState {
  const [core, setCore] = useState<SandboxDataset | null>(null);
  const [full, setFull] = useState<SandboxDataset | null>(null);
  const [mode, setMode] = useState<SandboxMode>("core");
  const [exploding, setExploding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadDataset(SANDBOX_CORE_ASSET)
      .then((d) => {
        if (active) setCore(d);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "Failed to load the network");
      });
    return () => {
      active = false;
    };
  }, []);

  const explode = useCallback(() => {
    if (full) {
      setMode("full");
      return;
    }
    setExploding(true);
    setError(null);
    loadDataset(SANDBOX_FULL_ASSET)
      .then((d) => {
        setFull(d);
        setMode("full");
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load the full network"))
      .finally(() => setExploding(false));
  }, [full]);

  const dataset = mode === "full" ? full : core;
  return { mode, dataset, error, explodable: mode !== "full", exploding, explode };
}
