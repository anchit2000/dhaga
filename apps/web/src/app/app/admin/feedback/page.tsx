// Dhaga Cloud only — see packages/ee/LICENSE.
import { listFeedbackPage } from "@dhaga/ee/admin";
import { FeedbackTable } from "@/components/app/table/AdminTables";
import { requireAdminForPage } from "@/lib/hosted/gate";
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZES } from "@/utils/constants/table";

export const metadata = { title: "Feedback — Admin — Dhaga" };

/** What users wrote in from the nav feedback box, newest first, server-paged. */
export default async function AdminFeedbackPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdminForPage();
  const params = await searchParams;
  const requested = Number(params.pageSize);
  const pageSize = TABLE_PAGE_SIZES.includes(requested as (typeof TABLE_PAGE_SIZES)[number]) ? requested : DEFAULT_TABLE_PAGE_SIZE;
  const page = Math.max(1, Number(params.page) || 1);
  const { rows, total } = await listFeedbackPage({ page, pageSize });
  return <div className="space-y-6"><h1 className="font-display text-2xl tracking-tight">Feedback</h1><FeedbackTable rows={rows} total={total} page={page} pageSize={pageSize} /></div>;
}
