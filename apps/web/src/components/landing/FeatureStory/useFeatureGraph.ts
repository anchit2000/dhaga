"use client";

import { useEffect, useState } from "react";
import { loadGraphDataset } from "@/components/landing/NetworkSandbox/LandingGraph/loadDataset";
import type { SandboxDataset } from "@/components/landing/NetworkSandbox/LandingGraph/useLandingGraph";
import { FEATURE_GRAPH_ASSET } from "@/utils/constants/landing";

export function useFeatureGraph(): {
  dataset: SandboxDataset | null;
  error: string | null;
} {
  const [dataset, setDataset] = useState<SandboxDataset | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadGraphDataset(FEATURE_GRAPH_ASSET)
      .then((nextDataset) => {
        if (active) setDataset(nextDataset);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Failed to load graph");
      });
    return () => {
      active = false;
    };
  }, []);

  return { dataset, error };
}
