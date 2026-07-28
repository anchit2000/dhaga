"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  removeCompanyAliasAction,
  updateCompanyAliasAction,
} from "@/lib/actions/company-aliases";
import type { AliasMappingRow } from "@/lib/repo/company-aliases";

/** One global-list row: the alias (inline-editable) next to its company, plus
 *  remove. Mutations run their scoped server action then router.refresh() so the
 *  server-rendered list re-reads; a transient failure toasts and keeps the row. */
function AliasRow({ row }: { row: AliasMappingRow }): React.ReactElement {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(row.alias);
  const [pending, startTransition] = useTransition();

  function save(): void {
    const trimmed = value.trim();
    if (!trimmed || trimmed === row.alias) {
      setValue(row.alias);
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", row.id);
      formData.set("alias", trimmed);
      const r = await updateCompanyAliasAction(formData);
      if (!r.ok) return void toast.error(r.error);
      setEditing(false);
      router.refresh();
    });
  }

  function remove(): void {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", row.id);
      const r = await removeCompanyAliasAction(formData);
      if (!r.ok) return void toast.error(r.error);
      router.refresh();
    });
  }

  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {editing ? (
          <Input
            className="h-8 max-w-xs"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") { event.preventDefault(); save(); }
            }}
            autoFocus
          />
        ) : (
          <span className="truncate text-sm text-paper">{row.alias}</span>
        )}
        <span className="truncate text-xs text-fog">{row.companyName}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {editing ? (
          <>
            <Button variant="ghost" size="icon-sm" loading={pending} onClick={save} aria-label="Save alias">
              <Check className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Cancel edit" onClick={() => { setValue(row.alias); setEditing(false); }}>
              <X className="size-3.5" />
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="icon-sm" onClick={() => setEditing(true)} aria-label="Edit alias">
              <Pencil className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" loading={pending} onClick={remove} aria-label="Remove alias">
              <X className="size-3.5" />
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

/** The global alias manager: every alias → company mapping, editable in place. */
export function AliasesManager({ aliases }: { aliases: AliasMappingRow[] }): React.ReactElement {
  return (
    <div className="rounded-2xl border border-seam bg-panel p-4 sm:p-6">
      <ul className="divide-y divide-seam">
        {aliases.map((row) => (
          <AliasRow key={row.id} row={row} />
        ))}
      </ul>
    </div>
  );
}
