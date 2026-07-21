"use client";

import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/utils/constants/table";
import type { DataTableColumn, DataTableEngine } from "./types";

/**
 * TanStack Table implementation of the client-mode DataTableEngine (contract
 * in types.ts). This is the only file that may import @tanstack/react-table.
 */
export function useDataTableEngine<Row>(
  rows: Row[],
  columns: DataTableColumn<Row>[],
  initialFilters: Record<string, string>,
): DataTableEngine<Row> {
  const columnDefs = columns.map<ColumnDef<Row>>((column) => ({
    id: column.id,
    accessorFn: (row) => column.value(row),
    filterFn: "includesString",
    sortingFn: "alphanumeric",
    enableColumnFilter: column.filter !== false,
    enableSorting: column.sortable !== false,
  }));
  const table = useReactTable({
    data: rows,
    columns: columnDefs,
    initialState: {
      pagination: { pageIndex: 0, pageSize: DEFAULT_TABLE_PAGE_SIZE },
      columnFilters: Object.entries(initialFilters)
        .filter(([, value]) => value.trim())
        .map(([id, value]) => ({ id, value })),
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });
  const { pagination, columnFilters } = table.getState();
  const pageCount = Math.max(1, table.getPageCount());
  return {
    visibleRows: table.getRowModel().rows.map((row) => row.original),
    totalRows: table.getFilteredRowModel().rows.length,
    pageCount,
    currentPage: Math.min(pagination.pageIndex + 1, pageCount),
    pageSize: pagination.pageSize,
    filterValue: (columnId) =>
      (table.getColumn(columnId)?.getFilterValue() as string | undefined) ?? "",
    setFilter: (columnId, value) => table.getColumn(columnId)?.setFilterValue(value),
    clearFilters: () => table.resetColumnFilters(),
    activeFilterCount: columnFilters.filter((filter) => String(filter.value ?? "").trim())
      .length,
    sortDirection: (columnId) => {
      const column = table.getColumn(columnId);
      if (!column || !column.getCanSort()) return undefined;
      return column.getIsSorted() || null;
    },
    toggleSort: (columnId) => {
      const column = table.getColumn(columnId);
      if (!column) return;
      const current = column.getIsSorted();
      // Deterministic asc → desc → unsorted cycle.
      if (current === "desc") column.clearSorting();
      else column.toggleSorting(current === "asc");
    },
    setPage: (page) => table.setPageIndex(page - 1),
    setPageSize: (size) => {
      table.setPageSize(size);
      table.setPageIndex(0);
    },
  };
}
