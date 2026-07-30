"use client";

import { Input } from "@/components/ui/input";
import { RepeatableList } from "../RepeatableList";
import { SectionHeader } from "../section-header";
import type { Address } from "@dhaga/core";

export function AddressSection({
  items,
  onChange,
}: {
  items: Address[];
  onChange: (next: Address[]) => void;
}) {
  return (
    <section className="space-y-2">
      <SectionHeader title="Addresses" />
      <RepeatableList
        items={items}
        onChange={onChange}
        makeEmpty={() => ({
          label: null,
          street: null,
          city: null,
          region: null,
          postalCode: null,
          country: null,
          note: null,
        })}
        addLabel="Add address"
        renderRow={(item, update) => (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input
              value={item.label ?? ""}
              placeholder="Label (Home / Work)"
              onChange={(event) => update({ label: event.target.value || null })}
            />
            <Input
              value={item.street ?? ""}
              placeholder="Street"
              onChange={(event) => update({ street: event.target.value || null })}
            />
            <Input
              value={item.city ?? ""}
              placeholder="City"
              onChange={(event) => update({ city: event.target.value || null })}
            />
            <Input
              value={item.region ?? ""}
              placeholder="State / region"
              onChange={(event) => update({ region: event.target.value || null })}
            />
            <Input
              value={item.postalCode ?? ""}
              placeholder="Postal code"
              onChange={(event) => update({ postalCode: event.target.value || null })}
            />
            <Input
              value={item.country ?? ""}
              placeholder="Country"
              onChange={(event) => update({ country: event.target.value || null })}
            />
          </div>
        )}
      />
    </section>
  );
}
