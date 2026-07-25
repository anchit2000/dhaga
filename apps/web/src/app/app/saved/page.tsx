import { SavedTabs } from "@/components/app/saved/SavedTabs";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { listContactFilterOptions, listContactsPage } from "@/lib/repo/contacts";
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZES } from "@/utils/constants/table";
import type { SavedTab } from "@/utils/constants/saved";

export const metadata = { title: "Saved — Dhaga" };

export default async function SavedPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUserIdForPage();
  const params = await searchParams;
  const tab: SavedTab = params.tab === "watching" ? "watching" : "starred";
  const requestedPageSize = Number(params.pageSize);
  const pageSize = TABLE_PAGE_SIZES.includes(requestedPageSize as (typeof TABLE_PAGE_SIZES)[number]) ? requestedPageSize : DEFAULT_TABLE_PAGE_SIZE;
  const page = Math.max(1, Number(params.page) || 1);
  const filters = { name: params.name ?? "", title: params.title ?? "", company: params.company ?? "", tags: params.tags ?? "" };
  const [{ rows: people, total }, options] = await Promise.all([
    listContactsPage({
      page,
      pageSize,
      name: filters.name,
      title: filters.title,
      company: filters.company,
      tag: filters.tags,
      ...(tab === "watching" ? { watched: true } : { starred: true }),
    }),
    listContactFilterOptions(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl tracking-tight">Saved</h1>
      <SavedTabs tab={tab} people={people} total={total} page={page} pageSize={pageSize} filters={filters} options={options} />
    </div>
  );
}
