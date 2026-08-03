"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactElement } from "react";

import { Network } from "lucide-react";

import { GRAPH_SCENES } from "@/utils/constants/landing/graph";

const GraphStage = dynamic(
  () => import("@/components/landing/FeatureStory/GraphStage").then((mod) => mod.GraphStage),
  { ssr: false },
);

export function CompactGraph(): ReactElement {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin: "0px 0px 80px" },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative h-[260px] overflow-hidden rounded-2xl border border-seam bg-ink shadow-[0_24px_80px_-48px_var(--shadow-cast)] sm:h-[320px]"
      aria-label="Interactive preview of Dhaga's relationship graph using synthetic data"
    >
      {visible ? (
        <GraphStage scene={GRAPH_SCENES[0]} compact />
      ) : (
        <div className="flex h-full items-center justify-center text-fog">
          <span className="flex items-center gap-2 text-sm">
            <Network className="size-4 text-magic" aria-hidden="true" />
            Interactive graph loads as you reach it
          </span>
        </div>
      )}
    </div>
  );
}
