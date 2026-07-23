"use client";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { EntityCombobox } from "@/components/app/EntityCombobox";
import { RepeatableList } from "./RepeatableList";
import type { ContactMethod, Position } from "@dhaga/core";

export function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <h3 className="font-mono text-[10px] uppercase tracking-widest text-fog/70">{title}</h3>
      {hint ? <span className="text-[11px] text-fog/50">{hint}</span> : null}
    </div>
  );
}

/** Emails / phones / links — a value plus an optional label (Work/Home/Mobile). */
export function MethodSection({
  title,
  items,
  onChange,
  inputType,
  valuePlaceholder,
  labelPlaceholder,
}: {
  title: string;
  items: ContactMethod[];
  onChange: (next: ContactMethod[]) => void;
  inputType: string;
  valuePlaceholder: string;
  labelPlaceholder: string;
}) {
  return (
    <section className="space-y-2">
      <SectionHeader title={title} />
      <RepeatableList
        items={items}
        onChange={onChange}
        makeEmpty={() => ({ value: "", label: null, note: null })}
        addLabel={`Add ${title.toLowerCase().replace(/s$/, "")}`}
        renderRow={(item, update) => (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_8rem]">
            <Input
              type={inputType}
              value={item.value}
              placeholder={valuePlaceholder}
              onChange={(event) => update({ value: event.target.value })}
            />
            <Input
              value={item.label ?? ""}
              placeholder={labelPlaceholder}
              onChange={(event) => update({ label: event.target.value || null })}
            />
          </div>
        )}
      />
    </section>
  );
}

/** Jobs — the source of truth for employment. Multiple, current or past. */
export function PositionSection({
  items,
  onChange,
}: {
  items: Position[];
  onChange: (next: Position[]) => void;
}) {
  return (
    <section className="space-y-2">
      <SectionHeader title="Jobs" hint="current & past" />
      <RepeatableList
        items={items}
        onChange={onChange}
        makeEmpty={() => ({
          title: "",
          company: "",
          department: null,
          current: items.length === 0,
          startedAt: null,
          endedAt: null,
          note: null,
        })}
        addLabel="Add job"
        renderRow={(item, update) => (
          <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                value={item.title ?? ""}
                placeholder="Title"
                onChange={(event) => update({ title: event.target.value })}
              />
              <EntityCombobox
                kinds={["company"]}
                inputValue={item.company ?? ""}
                onInputValueChange={(value) => update({ company: value })}
                onSelect={(target) => update({ company: target.label })}
                placeholder="Company"
                inputClassName="h-8"
              />
              <Input
                value={item.department ?? ""}
                placeholder="Department (optional)"
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
            <label className="flex items-center gap-2 text-xs text-fog">
              <Switch
                checked={item.current}
                onCheckedChange={(checked) => update({ current: checked })}
              />
              Current role
            </label>
          </>
        )}
      />
    </section>
  );
}
