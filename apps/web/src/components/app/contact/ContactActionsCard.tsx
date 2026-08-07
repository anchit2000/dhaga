import Link from "next/link";
import { Pencil, Waypoints } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddToEventPicker } from "@/components/app/AddToEventPicker";

/**
 * The contact page's primary actions, grouped into one sticky-sidebar card
 * above the info card: Edit, View in graph, and Add to group. Previously these
 * lived scattered in the header row (Edit/View) and the name block
 * (Add to group) — consolidated here so the header stays identity-only.
 */
export function ContactActionsCard({
  contactId,
  currentEventIds,
}: {
  contactId: string;
  currentEventIds: string[];
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-seam bg-panel p-4">
      <Button
        render={<Link href={`/app/people/${contactId}/edit`} />}
        variant="outline"
        size="sm"
        className="w-full justify-start"
      >
        <Pencil />
        Edit
      </Button>
      <Button
        render={<Link href={`/app/graph?focus=${contactId}`} />}
        variant="outline"
        size="sm"
        className="w-full justify-start"
      >
        <Waypoints />
        View in graph
      </Button>
      {/* The picker owns its trigger button and sets no width or alignment of
          its own, so in this stretched flex column it rendered full-width but
          centre-aligned — out of step with Edit / View in graph above it. */}
      <div className="[&>button]:w-full [&>button]:justify-start">
        <AddToEventPicker contactId={contactId} currentEventIds={currentEventIds} />
      </div>
    </div>
  );
}
