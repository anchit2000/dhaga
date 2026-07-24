"use client";

import { useMemo } from "react";
import { methodValues, primaryPosition } from "@dhaga/core";
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
  const titleOf = (candidate: ImportCandidate): string => primaryPosition(candidate.contact.positions)?.title ?? "";
  const companyOf = (candidate: ImportCandidate): string => primaryPosition(candidate.contact.positions)?.company ?? "";
  const emailOf = (candidate: ImportCandidate): string => methodValues(candidate.contact.emails)[0] ?? "";
  const phoneOf = (candidate: ImportCandidate): string => methodValues(candidate.contact.phones)[0] ?? "";
  const columns: DataTableColumn<ReviewRow>[] = [
    { id: "selected", label: "Selected", filter: false, sortable: false, value: () => "", render: (row) => <input type="checkbox" className="size-4 accent-amber" checked={selected.has(row.index)} onChange={() => onToggle(row.index)} aria-label={`Select ${row.candidate.contact.name}`} /> },
    { id: "name", label: "Name", value: (row) => row.candidate.contact.name, className: "font-medium text-paper" },
    { id: "title", label: "Title", value: (row) => titleOf(row.candidate), options: options(candidates.map(titleOf)), render: (row) => titleOf(row.candidate) || "—", className: "text-fog" },
    { id: "company", label: "Company", value: (row) => companyOf(row.candidate), options: options(candidates.map(companyOf)), render: (row) => companyOf(row.candidate) || "—", className: "text-fog" },
    { id: "email", label: "Email", value: (row) => emailOf(row.candidate), render: (row) => emailOf(row.candidate) || "—", className: "text-fog" },
    { id: "phone", label: "Phone", value: (row) => phoneOf(row.candidate), render: (row) => phoneOf(row.candidate) || "—", className: "text-fog" },
  ];

  return <DataTable rows={rows} columns={columns} rowKey={(row) => String(row.index)} />;
}
