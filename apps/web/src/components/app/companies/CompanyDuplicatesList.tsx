"use client";

import { useState } from "react";
import { GitMerge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanyMergeDialog } from "@/components/app/companies/CompanyMergeDialog";
import type { DuplicateCompanyCluster } from "@/lib/repo/companies";

/** Clusters of same-looking companies, each with a "Review & merge" trigger. */
export function CompanyDuplicatesList({ clusters }: { clusters: DuplicateCompanyCluster[] }) {
  const [mergeIds, setMergeIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  function review(cluster: DuplicateCompanyCluster): void {
    setMergeIds(cluster.companies.map((company) => company.id));
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      {clusters.map((cluster) => (
        <div key={cluster.normalizedName} className="rounded-2xl border border-seam bg-panel p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-paper">{cluster.companies.length} possible matches</p>
              <p className="truncate text-xs text-fog">Normalised as “{cluster.normalizedName}”</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => review(cluster)}>
              <GitMerge /> Review &amp; merge
            </Button>
          </div>
          <ul className="mt-3 divide-y divide-seam/60">
            {cluster.companies.map((company) => (
              <li key={company.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate text-paper">
                  {company.name}
                  {company.domain ? <span className="text-fog"> · {company.domain}</span> : null}
                </span>
                <span className="shrink-0 font-mono text-xs text-fog">
                  {company.contactCount} {company.contactCount === 1 ? "contact" : "contacts"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <CompanyMergeDialog ids={mergeIds} open={open} onOpenChange={setOpen} />
    </div>
  );
}
