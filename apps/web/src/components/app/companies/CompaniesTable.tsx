"use client";

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GitMergeIcon } from "@/components/ui/animated-icons";
import { DataTable, type DataTableColumn, type DataTableSelection } from "@/components/app/table/DataTable";
import { BulkActionBar } from "@/components/app/table/BulkActionBar";
import { CompanyRowActions } from "@/components/app/companies/CompanyRowActions";
import { CompanyFormDialog, type CompanyFormValues } from "@/components/app/companies/CompanyFormDialog";
import { CompanyMergeDialog } from "@/components/app/companies/CompanyMergeDialog";
import { CompanyDeleteDialog } from "@/components/app/companies/CompanyDeleteDialog";
import type { AnimatedIconHandle } from "@/components/ui/animated-icons";
import type { CompanyListItem } from "@/lib/repo/companies";

/**
 * Server-paginated, selectable company list. Selection lives here (a Set the
 * parent owns) rather than inside DataTable, so it survives the DataTable
 * remounting on every URL-driven page/filter change (keyed below) — selecting
 * rows across pages accumulates. Row and bulk actions open the shared
 * create/rename, merge, and delete dialogs.
 */
export function CompaniesTable({
  companies,
  total,
  page,
  pageSize,
  name,
}: {
  companies: CompanyListItem[];
  total: number;
  page: number;
  pageSize: number;
  name: string;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [renameTarget, setRenameTarget] = useState<CompanyFormValues | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [mergeIds, setMergeIds] = useState<string[]>([]);
  const [mergeOpen, setMergeOpen] = useState(false);
  const mergeIconRef = useRef<AnimatedIconHandle>(null);

  function toggleRow(id: string): void {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage(ids: string[], checked: boolean): void {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  function clearSelection(): void {
    setSelectedIds(new Set());
  }

  function openRename(company: CompanyListItem): void {
    setRenameTarget({ id: company.id, name: company.name, domain: company.domain, sector: company.sector });
    setRenameOpen(true);
  }

  function openDelete(ids: string[], singleName: string | null): void {
    setDeleteIds(ids);
    setDeleteName(singleName);
    setDeleteOpen(true);
  }

  const selection: DataTableSelection = { selectedIds, onToggleRow: toggleRow, onTogglePage: togglePage };
  const selectedList = [...selectedIds];

  const columns: DataTableColumn<CompanyListItem>[] = [
    {
      id: "name",
      label: "Name",
      value: (row) => row.name,
      render: (row) => (
        <div className="min-w-0">
          <span className="font-medium text-paper">{row.name}</span>
          {row.domain ? <span className="block truncate font-mono text-xs text-fog">{row.domain}</span> : null}
        </div>
      ),
    },
    { id: "sector", label: "Sector", value: (row) => row.sector ?? "", filter: false, render: (row) => row.sector || "—", className: "text-fog" },
    { id: "contacts", label: "Contacts", value: (row) => String(row.contactCount), filter: false, className: "font-mono text-xs text-fog" },
    {
      id: "actions",
      label: "",
      value: () => "",
      filter: false,
      sortable: false,
      className: "w-10 pr-1 text-right",
      render: (row) => (
        <CompanyRowActions name={row.name} onRename={() => openRename(row)} onDelete={() => openDelete([row.id], row.name)} />
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {selectedIds.size > 0 ? (
        <BulkActionBar count={selectedIds.size} onClear={clearSelection}>
          <Button variant="outline" size="xs" disabled={selectedIds.size < 2} onClick={() => { setMergeIds(selectedList); setMergeOpen(true); }} onMouseEnter={() => mergeIconRef.current?.startAnimation()} onMouseLeave={() => mergeIconRef.current?.stopAnimation()}>
            <GitMergeIcon ref={mergeIconRef} /> Merge
          </Button>
          <Button
            variant="destructive"
            size="xs"
            onClick={() => openDelete(selectedList, selectedList.length === 1 ? (companies.find((company) => company.id === selectedList[0])?.name ?? null) : null)}
          >
            <Trash2 /> Delete
          </Button>
        </BulkActionBar>
      ) : null}
      <DataTable
        key={`${page}:${pageSize}:${name}`}
        rows={companies}
        columns={columns}
        rowKey={(company) => company.id}
        emptyMessage="No companies match this search."
        initialFilters={{ name }}
        server={{ total, page, pageSize }}
        selection={selection}
      />
      <CompanyFormDialog company={renameTarget} open={renameOpen} onOpenChange={setRenameOpen} />
      <CompanyMergeDialog ids={mergeIds} open={mergeOpen} onOpenChange={setMergeOpen} onMerged={clearSelection} />
      <CompanyDeleteDialog ids={deleteIds} singleName={deleteName} open={deleteOpen} onOpenChange={setDeleteOpen} onDeleted={clearSelection} />
    </div>
  );
}
