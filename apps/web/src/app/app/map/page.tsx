import { requireUserIdForPage } from "@/lib/auth/guard";
import { MapView } from "@/components/app/map";

export const metadata = { title: "Map — Dhaga" };

export default async function MapPage() {
  await requireUserIdForPage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight">Map</h1>
        <p className="mt-1 text-sm text-fog">
          Where the people you know are, by city — tap a pin to see who&apos;s there.
        </p>
      </div>
      <MapView />
    </div>
  );
}
