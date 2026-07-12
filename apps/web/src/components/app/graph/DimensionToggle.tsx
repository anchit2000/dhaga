"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ClusterDimension } from "@/lib/repo/graph-data";

const DIMENSIONS: { value: ClusterDimension; label: string }[] = [
  { value: "company", label: "Company" },
  { value: "tag", label: "Tag" },
  { value: "location", label: "Location" },
];

/** Like a map's category filter — switches what the cluster bubbles group by. */
export function DimensionToggle({
  value,
  onChange,
}: {
  value: ClusterDimension;
  onChange: (dimension: ClusterDimension) => void;
}) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as ClusterDimension)}>
      <TabsList>
        {DIMENSIONS.map((dimension) => (
          <TabsTrigger key={dimension.value} value={dimension.value}>
            {dimension.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
