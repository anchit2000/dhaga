import Link from "next/link";
import { EmptyState } from "@/components/app/EmptyState";
import { CompaniesTable } from "@/components/app/companies/CompaniesTable";
import { NewCompanyButton } from "@/components/app/companies/NewCompanyButton";
import { Button } from "@/components/ui/button";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { listCompaniesPage } from "@/lib/repo/companies";
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZES } from "@/utils/constants/table";

export const metadata = { title: "Companies — Dhaga" };

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUserIdForPage();
  const params = await searchParams;
  const requestedPageSize = Number(params.pageSize);
  const pageSize = TABLE_PAGE_SIZES.includes(requestedPageSize as (typeof TABLE_PAGE_SIZES)[number]) ? requestedPageSize : DEFAULT_TABLE_PAGE_SIZE;
  const page = Math.max(1, Number(params.page) || 1);
  const name = params.name ?? "";
  const { rows, total } = await listCompaniesPage({ page, pageSize, name });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl tracking-tight">Companies</h1>
        <div className="flex items-center gap-3">
          <Button render={<Link href="/app/companies/duplicates" />} variant="ghost" size="sm">Find duplicates</Button>
          <NewCompanyButton />
        </div>
      </div>

      {total === 0 && !name ? (
        <EmptyState title="No companies yet" body="Companies appear as you add people with employers, or create one directly.">
          <NewCompanyButton />
        </EmptyState>
      ) : (
        <CompaniesTable companies={rows} total={total} page={page} pageSize={pageSize} name={name} />
      )}
    </div>
  );
}
