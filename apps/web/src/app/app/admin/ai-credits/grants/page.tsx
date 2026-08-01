// Dhaga Cloud only — see packages/ee/LICENSE.
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listAiCreditGrantsPage } from "@dhaga/ee/admin";
import { GrantsTable } from "@/components/app/table/AdminTables";
import { Button } from "@/components/ui/button";
import { requireAdminForPage } from "@/lib/hosted/gate";
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZES } from "@/utils/constants/table";

export const metadata = { title: "Grant ledger — Admin — Dhaga" };

export default async function AdminAiCreditGrantsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdminForPage();
  const params = await searchParams;
  const requested = Number(params.pageSize);
  const pageSize = TABLE_PAGE_SIZES.includes(requested as (typeof TABLE_PAGE_SIZES)[number]) ? requested : DEFAULT_TABLE_PAGE_SIZE;
  const page = Math.max(1, Number(params.page) || 1);
  const filters = { search: params.search ?? "" };
  const { rows, total } = await listAiCreditGrantsPage({ page, pageSize, ...filters });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-tight">Grant ledger</h1>
          <p className="mt-1 text-sm text-fog">
            Every AI-credit grant ever made, newest first. Usage in <code>ai_actions</code> is
            untouched by all of it.
          </p>
        </div>
        <Button render={<Link href="/app/admin/ai-credits" />} variant="outline" size="sm">
          <ArrowLeft />
          Back to AI credits
        </Button>
      </div>
      <GrantsTable grants={rows} total={total} page={page} pageSize={pageSize} filters={filters} />
    </div>
  );
}
