// Dhaga Cloud only — see packages/ee/LICENSE.
import { listSubscriptionsPage } from "@dhaga/ee/admin";
import { SubscriptionsTable } from "@/components/app/table/AdminTables";
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZES } from "@/utils/constants/table";

export default async function AdminSubscriptionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const requested = Number(params.pageSize);
  const pageSize = TABLE_PAGE_SIZES.includes(requested as (typeof TABLE_PAGE_SIZES)[number]) ? requested : DEFAULT_TABLE_PAGE_SIZE;
  const page = Math.max(1, Number(params.page) || 1);
  const filters = { user: params.user ?? "", plan: params.plan ?? "", status: params.status ?? "" };
  const { rows, total } = await listSubscriptionsPage({ page, pageSize, ...filters });
  return <div className="space-y-6"><h1 className="font-display text-2xl tracking-tight">Subscriptions</h1><SubscriptionsTable subscriptions={rows} total={total} page={page} pageSize={pageSize} filters={filters} /></div>;
}
