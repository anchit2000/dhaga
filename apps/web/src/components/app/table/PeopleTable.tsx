"use client";

import { useState } from "react";
import Link from "next/link";
import { StarButton } from "@/components/app/contact/StarButton";
import { PeopleBulkActions } from "@/components/app/people/PeopleBulkActions";
import { BulkActionBar } from "@/components/app/table/BulkActionBar";
import { DataTable, type DataTableColumn, type DataTableSelection } from "@/components/app/table/DataTable";
import { formatDate } from "@/utils/format-date";

interface PersonRow { id: string; name: string; title: string | null; companyName: string | null; tags: string[]; starred: boolean; createdAt: Date; }

export function PeopleTable({ people, total, page, pageSize, filters, options, enableBulkActions = false }: {
  people: PersonRow[];
  total: number;
  page: number;
  pageSize: number;
  filters: Record<string, string>;
  options: { titles: string[]; companies: string[]; tags: string[] };
  /** Opt-in row selection + bulk action bar (People page only; off for Saved). */
  enableBulkActions?: boolean;
}) {
  // Selection lives here, in a client component that stays mounted across the
  // table's soft-nav pagination, so selected ids survive paging back and forth.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggleRow(id: string): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage(ids: string[], checked: boolean): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  const selection: DataTableSelection | undefined = enableBulkActions
    ? { selectedIds, onToggleRow: toggleRow, onTogglePage: togglePage }
    : undefined;

  const columns: DataTableColumn<PersonRow>[] = [
    { id: "star", label: "", value: () => "", filter: false, sortable: false, className: "w-10 pr-0", render: (row) => <StarButton contactId={row.id} starred={row.starred} /> },
    { id: "name", label: "Name", value: (row) => row.name, render: (row) => <Link href={`/app/people/${row.id}`} className="font-medium text-paper hover:text-ember">{row.name}</Link> },
    { id: "title", label: "Title", value: (row) => row.title ?? "", options: options.titles, render: (row) => row.title || "—", className: "text-fog" },
    { id: "company", label: "Company", value: (row) => row.companyName ?? "", options: options.companies, render: (row) => row.companyName || "—", className: "text-fog" },
    { id: "tags", label: "Tags", value: (row) => row.tags.join(", "), options: options.tags, render: (row) => row.tags.join(", ") || "—", className: "max-w-64 truncate text-fog" },
    { id: "added", label: "Added", value: (row) => formatDate(row.createdAt), filter: false, className: "font-mono text-xs text-fog" },
  ];

  return (
    <div className="space-y-3">
      {selection && selectedIds.size > 0 ? (
        <BulkActionBar count={selectedIds.size} onClear={() => setSelectedIds(new Set())}>
          <PeopleBulkActions ids={[...selectedIds]} onClear={() => setSelectedIds(new Set())} />
        </BulkActionBar>
      ) : null}
      <DataTable key={`${page}:${pageSize}:${JSON.stringify(filters)}`} rows={people} columns={columns} rowKey={(person) => person.id} emptyMessage="No people match these filters." initialFilters={filters} server={{ total, page, pageSize }} selection={selection} />
    </div>
  );
}
