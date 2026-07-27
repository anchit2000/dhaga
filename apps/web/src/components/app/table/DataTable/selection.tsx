"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableHead } from "@/components/ui/table";

/**
 * External, parent-owned row selection for {@link DataTable}. Selection lives
 * OUTSIDE the table because PeopleTable runs in server mode (no TanStack row
 * model to hang a selection state off), so the selected ids are a Set the
 * parent owns — mirroring how ReviewTable threads a Set + toggle callbacks.
 */
export interface DataTableSelection {
  /** Ids (rowKey) currently selected, across every page the parent tracks. */
  selectedIds: Set<string>;
  /** Toggle a single row by its rowKey. */
  onToggleRow: (id: string) => void;
  /** Select/deselect every currently-rendered row (ids = rowKey of each). */
  onTogglePage: (ids: string[], checked: boolean) => void;
}

/**
 * Leading header cell: checked when every rendered row is selected, mixed when
 * only some are, clearing/selecting the whole rendered page on toggle.
 */
export function SelectionHeadCell({
  pageIds,
  selection,
}: {
  pageIds: string[];
  selection: DataTableSelection;
}) {
  const selectedCount = pageIds.reduce(
    (count, id) => (selection.selectedIds.has(id) ? count + 1 : count),
    0,
  );
  const allChecked = pageIds.length > 0 && selectedCount === pageIds.length;
  const someChecked = selectedCount > 0 && !allChecked;
  return (
    <TableHead className="w-10">
      <Checkbox
        checked={allChecked}
        indeterminate={someChecked}
        onCheckedChange={(checked) => selection.onTogglePage(pageIds, checked)}
        aria-label="Select all rows on this page"
      />
    </TableHead>
  );
}

/** Leading body cell: a checkbox bound to a single row's selected state. */
export function SelectionBodyCell({
  id,
  selection,
}: {
  id: string;
  selection: DataTableSelection;
}) {
  return (
    <TableCell className="w-10">
      <Checkbox
        checked={selection.selectedIds.has(id)}
        onCheckedChange={() => selection.onToggleRow(id)}
        aria-label="Select row"
      />
    </TableCell>
  );
}
