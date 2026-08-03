"use client";

import { useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CoverageNote } from "./CoverageNote";
import { useMapData } from "./use-map-data";
import type { MapPayload } from "@/types";

// MapLibre touches window/WebGL at construction — client-only chunk.
const MapCanvas = dynamic(() => import("./canvas/MapCanvas").then((m) => m.MapCanvas), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

function MapSkeleton(): React.ReactElement {
  return <Skeleton className="h-[70vh] min-h-[420px] w-full rounded-2xl" />;
}

/** Why the map is empty, in the user's terms — and which of the three reasons
 *  it actually is. Silence here would read as "you know nobody"; so would
 *  blaming missing locations while the server is still busy geocoding them. */
function emptyCopy(payload: MapPayload): { title: string; body: string; canRetryLater: boolean } {
  // Nothing is on the map YET, but something is on its way. Never say "no
  // locations" here: waiting is exactly what fixes this one.
  if (payload.pendingCount > 0) {
    return {
      title: "Placing your contacts",
      body: `${payload.pendingCount} location${payload.pendingCount === 1 ? " is" : "s are"} still being looked up — roughly one a second, in the background, because the map service allows no faster. This page fills itself in as they land.`,
      canRetryLater: true,
    };
  }
  if (payload.missingCount === 0 && payload.unresolvedCount === 0) {
    return {
      title: "No one on the map yet",
      body: "Add people and give them a location — a city is enough — and they'll show up here.",
      canRetryLater: false,
    };
  }
  const unplaced =
    payload.unresolvedCount > 0
      ? ` ${payload.unresolvedCount} location${payload.unresolvedCount === 1 ? " couldn't" : "s couldn't"} be matched to anywhere on the map.`
      : "";
  return {
    title: "No one on the map yet",
    body: `None of your ${payload.missingCount} contacts has a location yet. Locations come from a contact's profile — a city picked up from a card scan, an import, or typed in by hand.${unplaced}`,
    canRetryLater: false,
  };
}

/** Renders the map payload; this component only maps phases to UI. */
export function MapView(): React.ReactElement {
  const phase = useMapData();

  // Start the map chunk downloading NOW, alongside the payload fetch instead of
  // behind it. `dynamic` does not touch the network until MapCanvas first
  // RENDERS, which only happens in the `ready` branch below — so the ~900 KB
  // MapLibre chunk used to queue after GET /api/map (measured 1.1–5.5 s against
  // a remote Postgres) rather than overlapping it. Same specifier as the
  // `dynamic` import above, so this warms the one chunk, it does not add one.
  useEffect(() => {
    // Prefetch only: a failure here is re-raised by the real render path, which
    // is what reports it. Swallowed so it cannot become an unhandled rejection.
    void import("./canvas/MapCanvas").catch(() => {});
  }, []);

  if (phase.stage === "fetching") return <MapSkeleton />;

  if (phase.stage === "error") {
    return <EmptyState title="The map couldn't load" body={phase.message} />;
  }

  if (phase.stage === "empty") {
    const { title, body, canRetryLater } = emptyCopy(phase.payload);
    return (
      <EmptyState title={title} body={body}>
        {canRetryLater ? null : (
          <Button render={<Link href="/app/people" />} variant="secondary" size="sm">
            Open People
          </Button>
        )}
      </EmptyState>
    );
  }

  return (
    <div className="space-y-3">
      <MapCanvas places={phase.payload.places} />
      <CoverageNote payload={phase.payload} />
    </div>
  );
}
