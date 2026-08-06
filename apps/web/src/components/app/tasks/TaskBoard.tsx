"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type FilterFn,
  type PaginationState,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/app/EmptyState";
import { TablePagination } from "@/components/app/table/DataTable/Pagination";
import { useDebouncedValue } from "@/lib/data";
import { DEFAULT_TABLE_PAGE_SIZE, LIST_SEARCH_DEBOUNCE_MS } from "@/utils/constants/table";
import { TASK_FILTERS, TASK_STATUS_FILTERS } from "@/utils/constants/tasks";
import { inScope, inStatus, matchesTaskSearch } from "./filters";
import { TaskForm } from "./TaskForm";
import { TaskRow } from "./TaskRow";
import type { TaskItem } from "@/lib/repo/tasks";
import type { TaskFilter, TaskStatusFilter } from "@/utils/constants/tasks";

// One pseudo-column: a task renders as a card row, not a grid, so there is no
// column model to describe — this exists only so react-table has something to
// filter and paginate. Same shape as settings/AiCredits/ActivityCard.
const COLUMNS: ColumnDef<TaskItem>[] = [{ id: "task", accessorKey: "id" }];

const searchFilter: FilterFn<TaskItem> = (row, _columnId, value) =>
  matchesTaskSearch(row.original, String(value ?? ""));

export function TaskBoard({ items }: { items: TaskItem[] }): React.ReactElement {
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState<TaskStatusFilter>("active");
  const [scope, setScope] = useState<TaskFilter>("all");
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_TABLE_PAGE_SIZE,
  });
  const debouncedSearch = useDebouncedValue(search, LIST_SEARCH_DEBOUNCE_MS);

  const inTab = useMemo(() => items.filter((item) => inStatus(item, status)), [items, status]);
  const scoped = useMemo(() => inTab.filter((item) => inScope(item, scope)), [inTab, scope]);

  const table = useReactTable({
    data: scoped,
    columns: COLUMNS,
    state: { globalFilter: debouncedSearch, pagination },
    onPaginationChange: setPagination,
    globalFilterFn: searchFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Narrowing the set must never strand the user on a page past the new end.
  // Keyed off the raw search so the jump happens on the keystroke, not a beat
  // later when the debounced value lands.
  useEffect(() => {
    setPagination((current) =>
      current.pageIndex === 0 ? current : { ...current, pageIndex: 0 });
  }, [search, status, scope]);

  const rows = table.getRowModel().rows;
  const matched = table.getFilteredRowModel().rows.length;
  const pageCount = Math.max(1, table.getPageCount());

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="font-display text-2xl tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-fog">Work with or without a person attached.</p></div>
        <Button type="button" className="min-h-11" onClick={() => setCreating(true)} disabled={creating}><Plus />New task</Button>
      </div>
      {creating ? <TaskForm onDone={() => setCreating(false)} /> : null}
      <div className="space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fog" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tasks, people, companies" aria-label="Search tasks" className="h-11 pl-9" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TASK_STATUS_FILTERS.map((filter) => <Button key={filter.value} type="button" size="sm"
            className="min-h-11" variant={status === filter.value ? "default" : "outline"} onClick={() => setStatus(filter.value)}>{filter.label}</Button>)}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TASK_FILTERS.map((filter) => <Button key={filter.value} type="button" size="xs"
            className="min-h-11" variant={scope === filter.value ? "secondary" : "ghost"} onClick={() => setScope(filter.value)}>{filter.label}</Button>)}
        </div>
      </div>
      {rows.length ? <>
          <ul className="space-y-2">{rows.map((row) => <TaskRow key={row.original.id} item={row.original} />)}</ul>
          <TablePagination summary={`${matched} of ${inTab.length} tasks`} pageSize={pagination.pageSize}
            currentPage={Math.min(pagination.pageIndex + 1, pageCount)} pageCount={pageCount}
            onPageChange={(page) => table.setPageIndex(page - 1)} onPageSizeChange={(size) => { table.setPageSize(size); table.setPageIndex(0); }} />
        </>
        : inTab.length ? <EmptyState title="No matching tasks"
            body="Nothing in this tab matches that search or filter. Clear them to see the rest." />
        : <EmptyState title={status === "active" ? "Nothing waiting" : "No completed tasks"}
            body={status === "active" ? "Add a task for yourself, a person, or a company." : "Completed work will collect here."} />}
    </div>
  );
}
