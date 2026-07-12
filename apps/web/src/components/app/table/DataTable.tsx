"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZES } from "@/utils/constants/table";

export interface DataTableColumn<Row> {
  id: string;
  label: string;
  value: (row: Row) => string;
  render?: (row: Row) => ReactNode;
  filter?: boolean;
  className?: string;
  options?: readonly string[];
}

export function DataTable<Row>({ rows, columns, rowKey, emptyMessage = "No rows match these filters.", initialFilters = {}, server }: {
  rows: Row[];
  columns: DataTableColumn<Row>[];
  rowKey: (row: Row) => string;
  emptyMessage?: string;
  initialFilters?: Record<string, string>;
  server?: { total: number; page: number; pageSize: number };
}) {
  const router = useRouter();
  const [filters, setFilters] = useState<Record<string, string>>(initialFilters);
  const [page, setPage] = useState(server?.page ?? 1);
  const [pageSize, setPageSize] = useState(server?.pageSize ?? DEFAULT_TABLE_PAGE_SIZE);
  const activeFilters = Object.values(filters).filter(Boolean).length;
  const filtered = useMemo(() => rows.filter((row) => columns.every((column) => {
    const query = filters[column.id]?.trim().toLocaleLowerCase();
    return !query || column.value(row).toLocaleLowerCase().includes(query);
  })), [columns, filters, rows]);
  const total = server?.total ?? filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = server?.page ?? Math.min(page, pageCount);
  const visible = server ? rows : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function navigate(updates: Record<string, string>): void {
    const params = new URLSearchParams(window.location.search);
    Object.entries(updates).forEach(([key, value]) => value ? params.set(key, value) : params.delete(key));
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function updateFilter(id: string, value: string): void {
    setFilters((current) => ({ ...current, [id]: value }));
    setPage(1);
    if (server) navigate({ [id]: value, page: "1" });
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-seam bg-panel">
        <Table>
          <TableHeader>
            <TableRow>{columns.map((column) => <TableHead key={column.id}>{column.label}</TableHead>)}</TableRow>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => <TableHead key={column.id} className="h-auto px-2 py-2">
                  {column.filter === false ? null : column.options ? <Select value={filters[column.id] ?? ""} onChange={(event) => updateFilter(column.id, event.target.value)} aria-label={`Filter by ${column.label}`} className="h-8 min-w-32 text-xs"><option value="">All {column.label.toLocaleLowerCase()}</option>{column.options.map((option) => <option key={option} value={option}>{option}</option>)}</Select> : <div className="relative min-w-32">
                    <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-fog/60" />
                    <Input value={filters[column.id] ?? ""} onChange={(event) => setFilters((current) => ({ ...current, [column.id]: event.target.value }))} onBlur={(event) => updateFilter(column.id, event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") updateFilter(column.id, event.currentTarget.value); }} placeholder={`Search ${column.label.toLocaleLowerCase()}`} aria-label={`Filter by ${column.label}`} className="h-8 pl-7 text-xs" />
                  </div>}
              </TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? <TableRow><TableCell colSpan={columns.length} className="h-24 text-center text-fog">{emptyMessage}</TableCell></TableRow> : visible.map((row) => <TableRow key={rowKey(row)}>
              {columns.map((column) => <TableCell key={column.id} className={column.className}>{column.render ? column.render(row) : column.value(row)}</TableCell>)}
            </TableRow>)}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-fog">
        <div className="flex items-center gap-2"><span>{server ? `${rows.length} shown · ${total} total` : `${filtered.length} of ${rows.length} rows`}</span>{activeFilters > 0 ? <Button variant="ghost" size="xs" onClick={() => { setFilters({}); setPage(1); if (server) navigate(Object.fromEntries([...columns.map((column) => [column.id, ""]), ["page", "1"]])); }}><X /> Clear {activeFilters}</Button> : null}</div>
        <div className="flex items-center gap-2">
          <Select aria-label="Rows per page" value={pageSize} onChange={(event) => { const value = Number(event.target.value); setPageSize(value); setPage(1); if (server) navigate({ pageSize: String(value), page: "1" }); }} className="h-8 w-20 text-xs">{TABLE_PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}</Select>
          <span className="whitespace-nowrap">Page {currentPage} of {pageCount}</span>
          <Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={currentPage === 1} onClick={() => server ? navigate({ page: String(currentPage - 1) }) : setPage((value) => Math.max(1, value - 1))}><ChevronLeft /></Button>
          <Button variant="outline" size="icon-sm" aria-label="Next page" disabled={currentPage === pageCount} onClick={() => server ? navigate({ page: String(currentPage + 1) }) : setPage((value) => Math.min(pageCount, value + 1))}><ChevronRight /></Button>
        </div>
      </div>
    </div>
  );
}
