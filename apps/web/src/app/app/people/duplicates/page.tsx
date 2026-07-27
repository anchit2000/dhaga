import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ContactDuplicatesList } from "@/components/app/people/ContactDuplicatesList";
import { Button } from "@/components/ui/button";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { findDuplicateContactClusters } from "@/lib/repo/contacts";

export const metadata = { title: "Find duplicates — Dhaga" };

export default async function DuplicatesPage() {
  await requireUserIdForPage();
  const clusters = await findDuplicateContactClusters();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Find duplicates</h1>
          <p className="mt-1 text-sm text-fog">
            Contacts that look like the same person. Review each cluster, then merge.
          </p>
        </div>
        <Button render={<Link href="/app/people" />} variant="outline" size="sm">
          <ArrowLeft />
          Back to People
        </Button>
      </div>

      <ContactDuplicatesList clusters={clusters} />
    </div>
  );
}
