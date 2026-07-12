"use client";

import { useMemo } from "react";
import { DataTable, type DataTableColumn } from "@/components/app/table/DataTable";
import type { ImportCandidate } from "@/lib/import";

interface ReviewRow { candidate: ImportCandidate; index: number; }

export function ReviewTable({ candidates, selected, onToggle }: {
  candidates: ImportCandidate[];
  selected: Set<number>;
  onToggle: (index: number) => void;
}) {
  const rows = useMemo(() => candidates.map((candidate, index) => ({ candidate, index })), [candidates]);
  const options = (values: (string | null | undefined)[]): string[] => [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
  const columns: DataTableColumn<ReviewRow>[] = [
    { id: "selected", label: "Selected", filter: false, value: () => "", render: (row) => <input type="checkbox" className="size-4 accent-amber" checked={selected.has(row.index)} onChange={() => onToggle(row.index)} aria-label={`Select ${row.candidate.contact.name}`} /> },
    { id: "name", label: "Name", value: (row) => row.candidate.contact.name, className: "font-medium text-paper" },
    { id: "title", label: "Title", value: (row) => row.candidate.contact.title ?? "", options: options(candidates.map((candidate) => candidate.contact.title)), render: (row) => row.candidate.contact.title || "—", className: "text-fog" },
    { id: "company", label: "Company", value: (row) => row.candidate.contact.company ?? "", options: options(candidates.map((candidate) => candidate.contact.company)), render: (row) => row.candidate.contact.company || "—", className: "text-fog" },
    { id: "email", label: "Email", value: (row) => row.candidate.contact.emails[0] ?? "", render: (row) => row.candidate.contact.emails[0] || "—", className: "text-fog" },
  ];

  return <DataTable rows={rows} columns={columns} rowKey={(row) => String(row.index)} />;
}
