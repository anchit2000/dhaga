"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { EntityCombobox } from "@/components/app/EntityCombobox";
import type { RelationOption } from "@/utils/constants/people";
import { RepeatableList } from "./RepeatableList";
import { SectionHeader } from "./section-header";
import type { Position } from "@dhaga/core";

/** Field labels that differ between the Experience and Education editors. */
export interface PositionFieldLabels {
  /** Combobox placeholder — the organisation (Company / Institution). */
  company: string;
  /** First text field (Title / Degree / programme). */
  title: string;
  /** Second text field (Department / Field of study). */
  department: string;
  /** The current-role toggle text (Current role / Currently studying here). */
  currentToggle: string;
}

/**
 * One multi-row position editor. Experience and Education are the SAME editor
 * with different labels and a different set of relationship-type choices, so a
 * position row (a `positions` table row) is captured identically for both —
 * institution/company via the shared company combobox (→ findOrCreateCompany),
 * degree/title, field/department, years, a current toggle, and a stored
 * `relation` predicate that decides which section a row belongs to on reload.
 */
export function PositionEditor({
  items,
  onChange,
  title,
  hint,
  addLabel,
  labels,
  relationOptions,
  makeEmpty,
}: {
  items: Position[];
  onChange: (next: Position[]) => void;
  title: string;
  hint: string;
  addLabel: string;
  labels: PositionFieldLabels;
  relationOptions: readonly RelationOption[];
  makeEmpty: () => Position;
}) {
  return (
    <section className="space-y-2">
      <SectionHeader title={title} hint={hint} />
      <RepeatableList
        items={items}
        onChange={onChange}
        makeEmpty={makeEmpty}
        addLabel={addLabel}
        renderRow={(item, update) => (
          <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                value={item.title ?? ""}
                placeholder={labels.title}
                onChange={(event) => update({ title: event.target.value })}
              />
              <EntityCombobox
                kinds={["company"]}
                inputValue={item.company ?? ""}
                onInputValueChange={(value) => update({ company: value })}
                onSelect={(target) => update({ company: target.label })}
                onCreate={(name) => update({ company: name })}
                createLabel="Create company"
                placeholder={labels.company}
                inputClassName="h-8"
              />
              <Input
                value={item.department ?? ""}
                placeholder={labels.department}
                onChange={(event) => update({ department: event.target.value || null })}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={item.startedAt ?? ""}
                  placeholder="From"
                  onChange={(event) => update({ startedAt: event.target.value || null })}
                />
                <Input
                  value={item.endedAt ?? ""}
                  placeholder="To"
                  onChange={(event) => update({ endedAt: event.target.value || null })}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <label className="flex items-center gap-2 text-xs text-fog">
                <Switch
                  checked={item.current}
                  onCheckedChange={(checked) => update({ current: checked })}
                />
                {labels.currentToggle}
              </label>
              <Select
                aria-label="Relationship type"
                className="h-8 w-auto text-xs"
                value={item.relation ?? ""}
                onChange={(event) => update({ relation: event.target.value || null })}
              >
                {relationOptions.map((option) => (
                  <option key={option.label} value={option.value ?? ""}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </>
        )}
      />
    </section>
  );
}
