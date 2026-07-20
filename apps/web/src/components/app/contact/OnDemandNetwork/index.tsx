"use client";

import { Network } from "lucide-react";
import { ConnectionsSection } from "./ConnectionsSection";
import { NearbySection } from "./NearbySection";

export function OnDemandNetwork({ contactId }: { contactId: string }) {
  return (
    <section className="space-y-5 rounded-2xl border border-seam bg-panel p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber/10 text-amber">
          <Network className="size-4" />
        </span>
        <div>
          <h2 className="font-display text-lg">Network</h2>
          <p className="text-xs leading-relaxed text-fog">
            Paginated graph retrieval and local ranking—no AI calls when you browse.
          </p>
        </div>
      </div>
      <ConnectionsSection contactId={contactId} />
      <NearbySection contactId={contactId} />
    </section>
  );
}
