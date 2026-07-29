"use client";

import { Input } from "@/components/ui/input";
import {
  AFFILIATION_RELATION_OPTIONS,
  EDUCATION_RELATION_OPTIONS,
} from "@/utils/constants/people";
import { RepeatableList } from "./RepeatableList";
import { PositionEditor } from "./position-editor";
import { SectionHeader } from "./section-header";
import type { ContactMethod, Position } from "@dhaga/core";

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

/** Experience — the source of truth for employment/affiliation. Any one row's
 *  relationship type is selectable (default Employment → works_at/worked_at). */
export function PositionSection({
  items,
  onChange,
}: {
  items: Position[];
  onChange: (next: Position[]) => void;
}) {
  return (
    <PositionEditor
      items={items}
      onChange={onChange}
      title="Experience"
      hint="current & past"
      addLabel="Add role"
      labels={{
        title: "Title",
        company: "Company",
        department: "Department (optional)",
        currentToggle: "Current role",
      }}
      relationOptions={AFFILIATION_RELATION_OPTIONS}
      makeEmpty={() => ({
        title: "",
        company: "",
        department: null,
        current: items.length === 0,
        startedAt: null,
        endedAt: null,
        note: null,
        relation: null,
      })}
    />
  );
}

/** Education — the same editor, fixed to an education predicate (studied_at by
 *  default; "attended" for alumni). School → college → master's, first-class. */
export function EducationSection({
  items,
  onChange,
}: {
  items: Position[];
  onChange: (next: Position[]) => void;
}) {
  return (
    <PositionEditor
      items={items}
      onChange={onChange}
      title="Education"
      hint="schools & degrees"
      addLabel="Add education"
      labels={{
        title: "Degree / programme",
        company: "Institution",
        department: "Field of study",
        currentToggle: "Currently studying here",
      }}
      relationOptions={EDUCATION_RELATION_OPTIONS}
      makeEmpty={() => ({
        title: "",
        company: "",
        department: null,
        current: false,
        startedAt: null,
        endedAt: null,
        note: null,
        relation: "studied_at",
      })}
    />
  );
}
