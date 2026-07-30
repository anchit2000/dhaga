"use client";

import { Input } from "@/components/ui/input";
import { RepeatableList } from "../RepeatableList";
import { SectionHeader } from "../section-header";
import type { CustomField } from "@dhaga/core";

export function CustomFieldSection({
  items,
  onChange,
}: {
  items: CustomField[];
  onChange: (next: CustomField[]) => void;
}) {
  return (
    <section className="space-y-2">
      <SectionHeader title="Custom fields" hint="anything else" />
      <RepeatableList
        items={items}
        onChange={onChange}
        makeEmpty={() => ({ label: "", value: "" })}
        addLabel="Add field"
        renderRow={(item, update) => (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input
              value={item.label}
              placeholder="Field name"
              onChange={(event) => update({ label: event.target.value })}
            />
            <Input
              value={item.value}
              placeholder="Value"
              onChange={(event) => update({ value: event.target.value })}
            />
          </div>
        )}
      />
    </section>
  );
}
