/**
 * Why this matters: the merge dialog only asks the user to resolve a field when
 * the records genuinely disagree. These tests pin that promise — they fail if
 * computeScalarConflicts ever prompted on agreement (needless friction) or
 * stayed silent on a real conflict (silent data loss when the merge picks a
 * value the user never saw).
 */
import { describe, it, expect } from "vitest";
import { computeScalarConflicts } from "../merge";

interface Rec {
  name: string;
  location: string | null;
}

const fields: { key: keyof Rec; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "location", label: "Location" },
];

describe("computeScalarConflicts", () => {
  it("reports no conflict when every record agrees", () => {
    const records: Rec[] = [
      { name: "Ada Lovelace", location: "London" },
      { name: "Ada Lovelace", location: "London" },
    ];
    expect(computeScalarConflicts(records, fields)).toEqual([]);
  });

  it("surfaces a field, with its distinct values, when records differ", () => {
    const records: Rec[] = [
      { name: "Ada Lovelace", location: "London" },
      { name: "Ada Lovelace", location: "Paris" },
    ];
    // name agrees, so only location is a conflict to resolve.
    expect(computeScalarConflicts(records, fields)).toEqual([
      { field: "location", label: "Location", values: ["London", "Paris"] },
    ]);
  });

  it("ignores null and empty/whitespace values — a blank is not a competing choice", () => {
    const records: Rec[] = [
      { name: "Ada", location: "London" },
      { name: "Ada", location: null },
      { name: "Ada", location: "   " },
    ];
    // Only one real location value survives, so nothing to resolve.
    expect(computeScalarConflicts(records, fields)).toEqual([]);
  });

  it("dedupes distinct values by trimmed form so equal values don't double-count", () => {
    const records: Rec[] = [
      { name: "Ada", location: "London" },
      { name: "Ada", location: " London " },
      { name: "Ada", location: "Paris" },
    ];
    const conflicts = computeScalarConflicts(records, fields);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toEqual({
      field: "location",
      label: "Location",
      values: ["London", "Paris"],
    });
  });
});
