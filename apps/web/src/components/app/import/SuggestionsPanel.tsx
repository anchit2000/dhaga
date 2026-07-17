"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  confirmClusterCompanyAction,
  confirmClusterTagAction,
  dismissClusterAction,
} from "@/lib/actions/import";
import type { NameCluster } from "@/lib/suggestions/name-clusters";

type PendingAction = { key: string; kind: "tag" | "company" | "dismiss" } | null;

export function SuggestionsPanel({ clusters }: { clusters: NameCluster[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingAction>(null);

  if (clusters.length === 0) {
    return (
      <p className="text-sm text-fog">
        No name patterns to suggest right now — they appear when several saved
        names share a word (a surname, or a company written into the name).
      </p>
    );
  }

  async function run(
    cluster: NameCluster,
    kind: "tag" | "company" | "dismiss",
  ): Promise<void> {
    setPending({ key: cluster.key, kind });
    const input = { label: cluster.key, contactIds: cluster.contactIds };
    const result =
      kind === "tag"
        ? await confirmClusterTagAction(input)
        : kind === "company"
          ? await confirmClusterCompanyAction({ ...input, label: cluster.display })
          : await dismissClusterAction({ key: cluster.key });
    setPending(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (kind === "tag") toast.success(`Tagged ${cluster.contactIds.length} people “${cluster.key}”`);
    if (kind === "company") toast.success(`Linked to company — contacts without one`);
    router.refresh();
  }

  function spinnerOr(cluster: NameCluster, kind: "tag" | "company" | "dismiss", label: string) {
    const active = pending?.key === cluster.key && pending.kind === kind;
    return active ? <Loader2 className="size-3 animate-spin" /> : label;
  }

  return (
    <ul className="divide-y divide-seam overflow-hidden rounded-2xl border border-seam bg-panel">
      {clusters.map((cluster) => (
        <li key={cluster.key} className="flex flex-wrap items-center gap-3 px-4 py-3">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-paper">
              “{cluster.display}” · {cluster.contactIds.length} people
            </span>
            <span className="block truncate text-xs text-fog">
              {cluster.names.slice(0, 4).join(", ")}
              {cluster.names.length > 4 ? ` +${cluster.names.length - 4} more` : ""}
            </span>
          </span>
          <span className="flex flex-wrap gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={pending?.key === cluster.key}
              onClick={() => void run(cluster, "tag")}
            >
              {spinnerOr(cluster, "tag", `Tag “${cluster.key}”`)}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pending?.key === cluster.key}
              onClick={() => void run(cluster, "company")}
            >
              {spinnerOr(cluster, "company", "It's a company")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={pending?.key === cluster.key}
              onClick={() => void run(cluster, "dismiss")}
            >
              {spinnerOr(cluster, "dismiss", "Dismiss")}
            </Button>
          </span>
        </li>
      ))}
    </ul>
  );
}
