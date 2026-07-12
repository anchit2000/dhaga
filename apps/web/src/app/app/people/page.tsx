import Link from "next/link";
import { EmptyState } from "@/components/app/EmptyState";
import { PeopleTable } from "@/components/app/table/PeopleTable";
import { Button } from "@/components/ui/button";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { listContactFilterOptions, listContactsPage } from "@/lib/repo/contacts";
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZES } from "@/utils/constants/table";

export const metadata = { title: "People — Dhaga" };

export default async function PeoplePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUserIdForPage();
  const params = await searchParams;
  const requestedPageSize = Number(params.pageSize);
  const pageSize = TABLE_PAGE_SIZES.includes(requestedPageSize as (typeof TABLE_PAGE_SIZES)[number]) ? requestedPageSize : DEFAULT_TABLE_PAGE_SIZE;
  const page = Math.max(1, Number(params.page) || 1);
  const filters = { name: params.name ?? "", title: params.title ?? "", company: params.company ?? "", tags: params.tags ?? "" };
  const [{ rows: people, total }, options] = await Promise.all([
    listContactsPage({ page, pageSize, name: filters.name, title: filters.title, company: filters.company, tag: filters.tags }),
    listContactFilterOptions(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl tracking-tight">People</h1>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-fog/60">
            Export
            {(["csv", "vcard", "json"] as const).map((format) => (
              <a key={format} href={`/api/export/${format}`} className="underline-offset-2 transition-colors hover:text-paper hover:underline">{format}</a>
            ))}
          </span>
          <Button render={<Link href="/app/people/new" />} size="sm">Add person</Button>
        </div>
      </div>

      {total === 0 && Object.values(filters).every((value) => !value) ? (
        <EmptyState title="No people yet" body="Add your first contact manually, or paste a signature in Quick add.">
          <Button render={<Link href="/app/people/new" />} variant="outline" size="sm">Add your first person</Button>
        </EmptyState>
      ) : <PeopleTable people={people} total={total} page={page} pageSize={pageSize} filters={filters} options={options} />}
    </div>
  );
}
