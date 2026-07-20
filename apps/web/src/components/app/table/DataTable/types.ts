import type { ReactNode } from "react";

export interface DataTableColumn<Row> {
  id: string;
  label: string;
  value: (row: Row) => string;
  render?: (row: Row) => ReactNode;
  filter?: boolean;
  /** Header sorting in client mode; defaults to true. Server mode never sorts. */
  sortable?: boolean;
  className?: string;
  options?: readonly string[];
}

/**
 * What the DataTable markup needs from a client-mode table engine —
 * filtering, sorting, and pagination over in-memory rows. Implemented by
 * use-data-table.ts (TanStack Table); swapping the table library (or
 * hand-rolling again) means reimplementing this contract only.
 */
export interface DataTableEngine<Row> {
  /** Rows for the current page, after filter + sort. */
  visibleRows: Row[];
  /** Rows surviving the active filters. */
  totalRows: number;
  pageCount: number;
  currentPage: number;
  pageSize: number;
  filterValue: (columnId: string) => string;
  /** Live filter update — client tables filter as you type. */
  setFilter: (columnId: string, value: string) => void;
  clearFilters: () => void;
  activeFilterCount: number;
  /** "asc"/"desc", null when sortable but unsorted, undefined when the column can't sort. */
  sortDirection: (columnId: string) => "asc" | "desc" | null | undefined;
  /** Cycle asc → desc → unsorted. */
  toggleSort: (columnId: string) => void;
  setPage: (page: number) => void;
  /** Also returns to page 1 — a new size invalidates the old position. */
  setPageSize: (size: number) => void;
}
