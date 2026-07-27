"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/app/EmptyState";
import { ContactMergeDialog } from "@/components/app/people/ContactMergeDialog";
import { Button } from "@/components/ui/button";
import { DUPLICATE_CONTACT_REASON_LABELS } from "@/utils/constants/people";
import type { DuplicateContactCluster } from "@/lib/repo/contacts";

function metaOf(title: string | null, companyName: string | null): string {
  return [title, companyName].filter(Boolean).join(" · ") || "—";
}

/**
 * Likely-duplicate contact clusters with a per-cluster "Review & merge" that
 * opens the shared merge dialog prefilled with that cluster's ids.
 */
export function ContactDuplicatesList({ clusters }: { clusters: DuplicateContactCluster[] }) {
  const [openIds, setOpenIds] = useState<string[] | null>(null);

  if (clusters.length === 0) {
    return (
      <EmptyState
        title="No likely duplicates found."
        body="When two contacts share an email, phone, or a similar name, they'll show up here to merge."
      />
    );
  }

  return (
    <div className="space-y-4">
      {clusters.map((cluster) => {
        const ids = cluster.contacts.map((contact) => contact.id);
        return (
          <div
            key={`${cluster.reason}:${ids.join(",")}`}
            className="rounded-2xl border border-seam bg-panel p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-mono text-[10px] uppercase tracking-wider text-fog/60">
                {DUPLICATE_CONTACT_REASON_LABELS[cluster.reason]}
              </span>
              <Button variant="outline" size="sm" onClick={() => setOpenIds(ids)}>
                Review &amp; merge
              </Button>
            </div>
            <ul className="mt-3 divide-y divide-seam">
              {cluster.contacts.map((contact) => (
                <li key={contact.id} className="py-2">
                  <Link
                    href={`/app/people/${contact.id}`}
                    className="block min-w-0 transition-opacity hover:opacity-80"
                  >
                    <span className="block truncate text-sm font-medium text-paper">
                      {contact.name}
                    </span>
                    <span className="block truncate text-xs text-fog">
                      {metaOf(contact.title, contact.companyName)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <ContactMergeDialog
        ids={openIds ?? []}
        open={openIds !== null}
        onOpenChange={(open) => {
          if (!open) setOpenIds(null);
        }}
        onMerged={() => setOpenIds(null)}
      />
    </div>
  );
}
