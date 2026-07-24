"use client";

import { Switch } from "@/components/ui/switch";
import type { ReactElement } from "react";
import type { WrappedStats } from "@dhaga/core/src/api/wrapped";

/**
 * Reveals the two name-bearing superlatives — top company and most-connected
 * person — IN-APP ONLY. These never enter the share token, URL, or image; this
 * toggle only unhides them for the signed-in owner looking at their own card.
 */
export function RevealToggle({
  stats,
  revealed,
  onChange,
  disabled,
}: {
  stats: WrappedStats;
  revealed: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}): ReactElement {
  const reveal = stats.reveal;
  return (
    <div className="rounded-xl border border-seam bg-panel/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-paper">Show my names</p>
          <p className="mt-0.5 text-xs text-fog">Only you see this — never shared.</p>
        </div>
        <Switch checked={revealed} onCheckedChange={onChange} disabled={disabled} />
      </div>
      {revealed && reveal ? (
        <dl className="mt-4 space-y-2 border-t border-seam pt-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-fog">Top company</dt>
            <dd className="truncate font-medium text-paper">{reveal.topCompanyName ?? "—"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-fog">Most connected</dt>
            <dd className="truncate font-medium text-paper">{reveal.mostConnectedName ?? "—"}</dd>
          </div>
        </dl>
      ) : null}
    </div>
  );
}
