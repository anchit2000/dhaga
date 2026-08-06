"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { TABLE_PAGE_SIZES } from "@/utils/constants/table";

/**
 * The footer under a paginated collection: row summary, rows-per-page, page
 * position, prev/next. Shared so a non-grid list (the tasks board) gets the
 * same controls as DataTable without a second copy of them.
 *
 * `summary` is a string rather than a shown/total pair because the two callers
 * genuinely say different things — DataTable's server mode reports "page of
 * total", its client mode reports "matching of all" — and inventing a mode flag
 * here would only move that sentence choice into this file.
 */
export function TablePagination({
  summary,
  pageSize,
  currentPage,
  pageCount,
  onPageChange,
  onPageSizeChange,
  activeFilterCount = 0,
  onClearFilters,
}: {
  summary: string;
  pageSize: number;
  currentPage: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  activeFilterCount?: number;
  onClearFilters?: () => void;
}): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-fog">
      <div className="flex items-center gap-2"><span>{summary}</span>{activeFilterCount > 0 && onClearFilters ? <Button variant="ghost" size="xs" onClick={onClearFilters}><X /> Clear {activeFilterCount}</Button> : null}</div>
      <div className="flex items-center gap-2">
        <Select aria-label="Rows per page" value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))} className="h-8 w-20 text-xs">{TABLE_PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}</Select>
        <span className="whitespace-nowrap">Page {currentPage} of {pageCount}</span>
        <Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}><ChevronLeft /></Button>
        <Button variant="outline" size="icon-sm" aria-label="Next page" disabled={currentPage === pageCount} onClick={() => onPageChange(currentPage + 1)}><ChevronRight /></Button>
      </div>
    </div>
  );
}
