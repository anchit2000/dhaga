"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/app/table/DataTable";

interface PersonRow { id: string; name: string; title: string | null; companyName: string | null; tags: string[]; createdAt: Date; }

const COLUMNS: DataTableColumn<PersonRow>[] = [
  { id: "name", label: "Name", value: (row) => row.name, render: (row) => <Link href={`/app/people/${row.id}`} className="font-medium text-paper hover:text-amber">{row.name}</Link> },
  { id: "title", label: "Title", value: (row) => row.title ?? "", render: (row) => row.title || "—", className: "text-fog" },
  { id: "company", label: "Company", value: (row) => row.companyName ?? "", render: (row) => row.companyName || "—", className: "text-fog" },
  { id: "tags", label: "Tags", value: (row) => row.tags.join(", "), render: (row) => row.tags.join(", ") || "—", className: "max-w-64 truncate text-fog" },
  { id: "added", label: "Added", value: (row) => row.createdAt.toLocaleDateString(), className: "font-mono text-xs text-fog" },
];

export function PeopleTable({ people }: { people: PersonRow[] }) {
  return <DataTable rows={people} columns={COLUMNS} rowKey={(person) => person.id} emptyMessage="No people match these filters." />;
}
