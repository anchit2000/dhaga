"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addCompanyAliasAction,
  listCompanyAliasesAction,
  removeCompanyAliasAction,
  updateCompanyAliasAction,
} from "@/lib/actions/company-aliases";
import type { CompanyAliasRow } from "@/lib/db/schema";

/** One alias row: view → inline edit, plus remove. Each mutation applies at once
 *  via its own scoped server action; a transient failure toasts and keeps the row. */
function AliasRow({ alias, onChanged }: { alias: CompanyAliasRow; onChanged: () => void }): React.ReactElement {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(alias.alias);
  const [pending, startTransition] = useTransition();

  function save(): void {
    const trimmed = value.trim();
    if (!trimmed || trimmed === alias.alias) {
      setValue(alias.alias);
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", alias.id);
      formData.set("alias", trimmed);
      const r = await updateCompanyAliasAction(formData);
      if (!r.ok) return void toast.error(r.error);
      setEditing(false);
      onChanged();
    });
  }

  function remove(): void {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("id", alias.id);
      const r = await removeCompanyAliasAction(formData);
      if (!r.ok) return void toast.error(r.error);
      onChanged();
    });
  }
  return (
    <li className="flex items-center justify-between gap-2 py-2">
      {editing ? (
        <Input
          className="h-8"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") { event.preventDefault(); save(); }
          }}
          autoFocus
        />
      ) : (
        <span className="truncate text-sm text-paper">{alias.alias}</span>
      )}
      <div className="flex shrink-0 items-center gap-1">
        {editing ? (
          <>
            <Button variant="ghost" size="icon-sm" loading={pending} onClick={save} aria-label="Save alias">
              <Check className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Cancel edit" onClick={() => { setValue(alias.alias); setEditing(false); }}>
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

/** Alias editor embedded in the company edit dialog. Loads the company's aliases
 *  on mount and after each change (a scoped server-action round-trip), so the
 *  list stays truthful without threading aliases through the table. */
export function AliasSection({ companyId }: { companyId: string }): React.ReactElement {
  const [aliases, setAliases] = useState<CompanyAliasRow[]>([]);
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();

  const reload = useCallback(() => {
    listCompanyAliasesAction(companyId).then((r) => {
      if (r.ok) setAliases(r.data);
    });
  }, [companyId]);
  useEffect(() => { reload(); }, [reload]);

  function add(): void {
    const trimmed = value.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("companyId", companyId);
      formData.set("alias", trimmed);
      const r = await addCompanyAliasAction(formData);
      if (!r.ok) return void toast.error(r.error);
      setValue("");
      reload();
    });
  }
  return (
    <div className="space-y-2 border-t border-seam pt-4">
      <Label className="text-fog">Also known as</Label>
      <p className="text-xs text-fog">
        Prior names, acronyms, or acquisitions. Aliases resolve this company on capture and
        help find duplicates. Changes save as you make them.
      </p>
      <div className="flex items-end gap-2">
        <Input
          className="h-9"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") { event.preventDefault(); add(); }
          }}
          placeholder="Acme Corp"
        />
        <Button variant="outline" size="sm" loading={pending} disabled={!value.trim()} onClick={add}>
          Add
        </Button>
      </div>
      {aliases.length > 0 ? (
        <ul className="divide-y divide-seam">
          {aliases.map((alias) => (
            <AliasRow key={alias.id} alias={alias} onChanged={reload} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
