import Link from "next/link";
import { EmptyState } from "@/components/app/EmptyState";
import { CompanyDuplicatesList } from "@/components/app/companies/CompanyDuplicatesList";
import { Button } from "@/components/ui/button";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { findDuplicateCompanyClusters } from "@/lib/repo/companies";

export const metadata = { title: "Duplicate companies — Dhaga" };

export default async function CompanyDuplicatesPage() {
  await requireUserIdForPage();
  const clusters = await findDuplicateCompanyClusters();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl tracking-tight">Duplicate companies</h1>
          <p className="mt-1 text-sm text-fog">Companies whose names look like the same organisation. Review and merge.</p>
        </div>
        <Button render={<Link href="/app/companies" />} variant="ghost" size="sm">Back to companies</Button>
      </div>

      {clusters.length === 0 ? (
        <EmptyState title="No duplicates found" body="Every company in your graph has a distinct name." />
      ) : (
        <CompanyDuplicatesList clusters={clusters} />
      )}
    </div>
  );
}
