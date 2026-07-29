import Link from "next/link";
import { EmptyState } from "@/components/app/EmptyState";
import { AliasesManager } from "@/app/app/companies/aliases/AliasesManager";
import { Button } from "@/components/ui/button";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { listAllAliases } from "@/lib/repo/company-aliases";

export const metadata = { title: "Company aliases — Dhaga" };

export default async function CompanyAliasesPage() {
  await requireUserIdForPage();
  const aliases = await listAllAliases();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl tracking-tight">Company aliases</h1>
          <p className="mt-1 text-sm text-fog">
            Alternate names your companies are known by. Aliases resolve companies on capture
            and help find duplicates.
          </p>
        </div>
        <Button render={<Link href="/app/companies" />} variant="ghost" size="sm">Back to companies</Button>
      </div>

      {aliases.length === 0 ? (
        <EmptyState
          title="No aliases yet"
          body="Aliases are recorded when you merge companies, or add them from a company's edit dialog."
        />
      ) : (
        <AliasesManager aliases={aliases} />
      )}
    </div>
  );
}
