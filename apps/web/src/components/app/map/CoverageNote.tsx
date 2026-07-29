import type { MapPayload } from "@/types";

function plural(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

/**
 * The honesty line. Most contacts have no location at all, so the map is a
 * partial view by default — this says so quietly, under the canvas, instead of
 * letting a half-empty map read as "this is everyone".
 *
 * The three "not shown" buckets stay separate on purpose. They have different
 * answers: `pendingCount` resolves itself if you wait (the page is polling),
 * `unresolvedCount` never will, and `missingCount` needs the user to add a
 * location. Folding pending into "couldn't be placed" would report a permanent
 * failure for something that is merely a second away.
 */
export function CoverageNote({ payload }: { payload: MapPayload }): React.ReactElement {
  const mapped = payload.places.reduce((total, place) => total + place.contacts.length, 0);

  return (
    <div className="space-y-0.5 text-xs text-fog">
      <p>
        <span>
          {plural(payload.places.length, "place")} · {plural(mapped, "contact")} mapped
        </span>
        {payload.pendingCount > 0 ? (
          <span className="text-amber"> · {payload.pendingCount} still being placed</span>
        ) : null}
        {payload.unresolvedCount > 0 ? (
          <span> · {payload.unresolvedCount} couldn&apos;t be placed</span>
        ) : null}
        {payload.missingCount > 0 ? (
          <span> · {payload.missingCount} with no location</span>
        ) : null}
      </p>
      <p>
        Pins are city-grain, from the location on each contact — not everyone in your network is
        here.
      </p>
    </div>
  );
}
