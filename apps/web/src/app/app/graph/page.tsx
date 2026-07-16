import { requireUserIdForPage } from "@/lib/auth/guard";
import { GraphView } from "@/components/app/graph";

export const metadata = { title: "Graph — Dhaga" };

export default async function GraphPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const viewerId = await requireUserIdForPage();
  const { focus } = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight">Graph</h1>
        <p className="mt-1 text-sm text-fog">
          Your whole network on one canvas — click a node to isolate its
          circle, search to fly anywhere.
        </p>
      </div>
      <GraphView focusId={focus ?? null} viewerId={viewerId} />
    </div>
  );
}
