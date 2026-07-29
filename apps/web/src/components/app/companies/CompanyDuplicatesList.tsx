"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { GitMergeIcon } from "@/components/ui/animated-icons";
import { CompanyMergeDialog } from "@/components/app/companies/CompanyMergeDialog";
import type { AnimatedIconHandle } from "@/components/ui/animated-icons";
import type { DuplicateCompanyCluster } from "@/lib/repo/companies";

/** One cluster's merge trigger. Its own component so each rendered button owns
 *  an icon ref — the animation is driven from the button, not the 14px glyph. */
function ReviewMergeButton({ onClick }: { onClick: () => void }): React.ReactElement {
  const iconRef = useRef<AnimatedIconHandle>(null);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      onMouseEnter={() => iconRef.current?.startAnimation()}
      onMouseLeave={() => iconRef.current?.stopAnimation()}
    >
      <GitMergeIcon ref={iconRef} /> Review &amp; merge
    </Button>
  );
}

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
            <ReviewMergeButton onClick={() => review(cluster)} />
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
