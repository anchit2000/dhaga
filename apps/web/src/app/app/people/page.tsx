import Link from "next/link";
import { CopyCheck } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";
import { PeopleTable } from "@/components/app/table/PeopleTable";
import { Button } from "@/components/ui/button";
import { requireUserIdForPage } from "@/lib/auth/guard";
import { countServiceContacts, listContactFilterOptions, listContactsPage } from "@/lib/repo/contacts";
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZES } from "@/utils/constants/table";

export const metadata = { title: "People — Dhaga" };

export default async function PeoplePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUserIdForPage();
  const params = await searchParams;
  const requestedPageSize = Number(params.pageSize);
  const pageSize = TABLE_PAGE_SIZES.includes(requestedPageSize as (typeof TABLE_PAGE_SIZES)[number]) ? requestedPageSize : DEFAULT_TABLE_PAGE_SIZE;
  const page = Math.max(1, Number(params.page) || 1);
  const filters = { name: params.name ?? "", title: params.title ?? "", company: params.company ?? "", tags: params.tags ?? "" };
  // `?kind=service` NARROWS the listing to the rows kept off suggestions — the
  // destination of the "N hidden from suggestions" link below. Absent (the
  // normal case) the listing is unfiltered and shows services alongside
  // everyone else; People is never allowed to hide a row.
  const kind = params.kind === "service" ? ("service" as const) : undefined;
  const [{ rows: people, total }, options] = await Promise.all([
    listContactsPage({ page, pageSize, name: filters.name, title: filters.title, company: filters.company, tag: filters.tags, kind }),
    listContactFilterOptions(),
  ]);
  // Sequential, not folded into the Promise.all above: the tenant pool caps at
  // 3 connections and listContactsPage already fans out two of its own.
  const hiddenFromSuggestions = await countServiceContacts();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-tight">People</h1>
          {/* Suppression is only defensible while it is visible and reversible,
              so the count is always on the page it affects — and it links to
              the rows themselves, never to an explanation of them. */}
          {kind ? (
            <Link href="/app/people" className="mt-0.5 inline-flex min-h-11 items-center text-xs text-fog underline-offset-2 transition-colors hover:text-ember hover:underline">
              Showing people hidden from suggestions · Show everyone
            </Link>
          ) : hiddenFromSuggestions > 0 ? (
            <Link href="/app/people?kind=service" className="mt-0.5 inline-flex min-h-11 items-center text-xs text-fog underline-offset-2 transition-colors hover:text-ember hover:underline">
              {hiddenFromSuggestions} hidden from suggestions →
            </Link>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-fog">
            Export
            {(["csv", "vcard", "json"] as const).map((format) => (
              <a key={format} href={`/api/export/${format}`} className="underline-offset-2 transition-colors hover:text-paper hover:underline">{format}</a>
            ))}
          </span>
          <Button render={<Link href="/app/people/duplicates" />} variant="ghost" size="sm">
            <CopyCheck />
            Find duplicates
          </Button>
          <Button render={<Link href="/app/people/new" />} size="sm">Add person</Button>
        </div>
      </div>

      {total === 0 && !kind && Object.values(filters).every((value) => !value) ? (
        <EmptyState title="No people yet" body="Add your first contact manually, or paste a signature in Quick add.">
          <Button render={<Link href="/app/people/new" />} variant="outline" size="sm">Add your first person</Button>
        </EmptyState>
      ) : <PeopleTable people={people} total={total} page={page} pageSize={pageSize} filters={filters} options={options} enableBulkActions />}
    </div>
  );
}
