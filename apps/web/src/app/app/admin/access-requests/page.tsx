// Dhaga Cloud only — see packages/ee/LICENSE.
import { listAccessRequestsPage } from "@dhaga/ee/access-requests";
import type { AccessRequestStatus } from "@dhaga/ee/access-requests";
import { RequestsTable } from "@/components/app/table/AdminTables";
import { ACCESS_REQUEST_STATUS_OPTIONS, DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZES } from "@/utils/constants/table";

export default async function AccessRequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const requested = Number(params.pageSize);
  const pageSize = TABLE_PAGE_SIZES.includes(requested as (typeof TABLE_PAGE_SIZES)[number]) ? requested : DEFAULT_TABLE_PAGE_SIZE;
  const page = Math.max(1, Number(params.page) || 1);
  const status = ACCESS_REQUEST_STATUS_OPTIONS.includes(params.status as AccessRequestStatus) ? params.status as AccessRequestStatus : undefined;
  const filters = { email: params.email ?? "", status: status ?? "" };
  const { rows, total } = await listAccessRequestsPage({ page, pageSize, email: filters.email, status });
  return <div className="space-y-6"><h1 className="font-display text-2xl tracking-tight">Access requests</h1><RequestsTable rows={rows} total={total} page={page} pageSize={pageSize} filters={filters} /></div>;
}
