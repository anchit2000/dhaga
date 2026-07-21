"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TABLE_PAGE_SIZES } from "@/utils/constants/table";
import { useDataTableEngine } from "./use-data-table";
import { useTableUrlState } from "./use-table-url-state";
import type { DataTableColumn } from "./types";

export type { DataTableColumn, DataTableEngine } from "./types";

export function DataTable<Row>({ rows, columns, rowKey, emptyMessage = "No rows match these filters.", initialFilters = {}, server }: {
  rows: Row[];
  columns: DataTableColumn<Row>[];
  rowKey: (row: Row) => string;
  emptyMessage?: string;
  initialFilters?: Record<string, string>;
  server?: { total: number; page: number; pageSize: number };
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>(initialFilters);
  const engine = useDataTableEngine(rows, columns, server ? {} : initialFilters);
  const filterIds = columns.filter((column) => column.filter !== false).map((column) => column.id);
  const url = useTableUrlState(filterIds);

  const total = server ? server.total : engine.totalRows;
  const pageSize = server ? server.pageSize : engine.pageSize;
  const pageCount = server ? Math.max(1, Math.ceil(total / pageSize)) : engine.pageCount;
  const currentPage = server ? server.page : engine.currentPage;
  const visible = server ? rows : engine.visibleRows;
  const activeFilters = server ? Object.values(drafts).filter(Boolean).length : engine.activeFilterCount;
  const filterValue = (id: string): string => (server ? (drafts[id] ?? "") : engine.filterValue(id));

  function updateFilter(id: string, value: string): void {
    if (server) {
      setDrafts((current) => ({ ...current, [id]: value }));
      url.setParams({ [id]: value, page: 1 });
    } else {
      engine.setFilter(id, value);
    }
  }

  function clearFilters(): void {
    if (server) {
      setDrafts({});
      url.setParams({ ...Object.fromEntries(filterIds.map((id) => [id, null])), page: 1 });
    } else {
      engine.clearFilters();
    }
  }

  function goToPage(page: number): void {
    if (server) url.setParams({ page });
    else engine.setPage(page);
  }

  return (
    <div className="space-y-3">
      <div
        className="overflow-hidden rounded-2xl border border-seam bg-panel transition-opacity duration-200 data-[busy=true]:opacity-60"
        data-busy={url.isNavigating}
        aria-busy={url.isNavigating}
      >
        <Table>
          <TableHeader>
            <TableRow>{columns.map((column) => {
              const direction = server ? undefined : engine.sortDirection(column.id);
              return <TableHead key={column.id} aria-sort={direction === "asc" ? "ascending" : direction === "desc" ? "descending" : undefined}>
                {direction === undefined ? column.label : <Button variant="ghost" size="xs" className="-ml-2" onClick={() => engine.toggleSort(column.id)}>
                  {column.label}
                  {direction === "asc" ? <ArrowUp /> : direction === "desc" ? <ArrowDown /> : <ChevronsUpDown className="text-fog/50" />}
                </Button>}
              </TableHead>;
            })}</TableRow>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => <TableHead key={column.id} className="h-auto px-2 py-2">
                  {column.filter === false ? null : column.options ? <Select value={filterValue(column.id)} onChange={(event) => updateFilter(column.id, event.target.value)} aria-label={`Filter by ${column.label}`} className="h-8 min-w-32 text-xs"><option value="">All {column.label.toLocaleLowerCase()}</option>{column.options.map((option) => <option key={option} value={option}>{option}</option>)}</Select> : <div className="relative min-w-32">
                    <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-fog/60" />
                    <Input value={filterValue(column.id)} onChange={(event) => server ? setDrafts((current) => ({ ...current, [column.id]: event.target.value })) : engine.setFilter(column.id, event.target.value)} onBlur={(event) => { if (server) updateFilter(column.id, event.target.value); }} onKeyDown={(event) => { if (server && event.key === "Enter") updateFilter(column.id, event.currentTarget.value); }} placeholder={`Search ${column.label.toLocaleLowerCase()}`} aria-label={`Filter by ${column.label}`} className="h-8 pl-7 text-xs" />
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
        <div className="flex items-center gap-2"><span>{server ? `${rows.length} shown · ${total} total` : `${engine.totalRows} of ${rows.length} rows`}</span>{activeFilters > 0 ? <Button variant="ghost" size="xs" onClick={clearFilters}><X /> Clear {activeFilters}</Button> : null}</div>
        <div className="flex items-center gap-2">
          <Select aria-label="Rows per page" value={pageSize} onChange={(event) => { const value = Number(event.target.value); if (server) url.setParams({ pageSize: value, page: 1 }); else engine.setPageSize(value); }} className="h-8 w-20 text-xs">{TABLE_PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}</Select>
          <span className="whitespace-nowrap">Page {currentPage} of {pageCount}</span>
          <Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)}><ChevronLeft /></Button>
          <Button variant="outline" size="icon-sm" aria-label="Next page" disabled={currentPage === pageCount} onClick={() => goToPage(currentPage + 1)}><ChevronRight /></Button>
        </div>
      </div>
    </div>
  );
}
