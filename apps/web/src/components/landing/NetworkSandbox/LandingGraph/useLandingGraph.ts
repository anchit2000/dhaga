"use client";

import { useCallback, useEffect, useState } from "react";
import type { GraphIndexes } from "@/components/app/graph/logic/indexes";
import { SANDBOX_CORE_ASSET, SANDBOX_FULL_ASSET } from "@/utils/constants/landing";
import type { FullGraphPayload, PositionMap } from "@/components/app/graph/types";
import { loadGraphDataset } from "./loadDataset";

export type SandboxMode = "core" | "full";

export interface SandboxDataset {
  payload: FullGraphPayload;
  positions: PositionMap;
  indexes: GraphIndexes;
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
    loadGraphDataset(SANDBOX_CORE_ASSET)
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
    loadGraphDataset(SANDBOX_FULL_ASSET)
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
