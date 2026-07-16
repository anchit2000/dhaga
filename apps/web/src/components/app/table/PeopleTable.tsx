"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/app/table/DataTable";
import { formatDate } from "@/utils/format-date";

interface PersonRow { id: string; name: string; title: string | null; companyName: string | null; tags: string[]; createdAt: Date; }

export function PeopleTable({ people, total, page, pageSize, filters, options }: {
  people: PersonRow[];
  total: number;
  page: number;
  pageSize: number;
  filters: Record<string, string>;
  options: { titles: string[]; companies: string[]; tags: string[] };
}) {
  const columns: DataTableColumn<PersonRow>[] = [
    { id: "name", label: "Name", value: (row) => row.name, render: (row) => <Link href={`/app/people/${row.id}`} className="font-medium text-paper hover:text-ember">{row.name}</Link> },
    { id: "title", label: "Title", value: (row) => row.title ?? "", options: options.titles, render: (row) => row.title || "—", className: "text-fog" },
    { id: "company", label: "Company", value: (row) => row.companyName ?? "", options: options.companies, render: (row) => row.companyName || "—", className: "text-fog" },
    { id: "tags", label: "Tags", value: (row) => row.tags.join(", "), options: options.tags, render: (row) => row.tags.join(", ") || "—", className: "max-w-64 truncate text-fog" },
    { id: "added", label: "Added", value: (row) => formatDate(row.createdAt), filter: false, className: "font-mono text-xs text-fog" },
  ];
  return <DataTable key={`${page}:${pageSize}:${JSON.stringify(filters)}`} rows={people} columns={columns} rowKey={(person) => person.id} emptyMessage="No people match these filters." initialFilters={filters} server={{ total, page, pageSize }} />;
}
