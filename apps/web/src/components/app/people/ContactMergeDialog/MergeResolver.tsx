"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatDate } from "@/utils/format-date";
import type { ContactMergeRecord } from "@/lib/repo/contacts";
import { MergePreview } from "./MergePreview";
import { mergeConflicts } from "./resolution";

function primaryMeta(record: ContactMergeRecord): string {
  const parts = [record.title, record.companyName].filter(Boolean);
  return `${parts.join(" · ")}${parts.length ? " · " : ""}Added ${formatDate(record.createdAt)}`;
}

/**
 * The resolved merge UI once the records are loaded: pick the surviving record,
 * resolve any competing name/nickname/location values, and preview the combined
 * multi-value fields. All state is owned by the parent so it can build and
 * submit the resolution.
 */
export function MergeResolver({
  records,
  targetId,
  onTargetChange,
  choices,
  onChoiceChange,
}: {
  records: ContactMergeRecord[];
  targetId: string;
  onTargetChange: (id: string) => void;
  choices: Record<string, string>;
  onChoiceChange: (field: string, value: string) => void;
}) {
  const conflicts = mergeConflicts(records);

  return (
    <div className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-paper">Keep this contact</legend>
        <RadioGroup value={targetId} onValueChange={onTargetChange} aria-label="Primary contact">
          {records.map((record) => (
            <label
              key={record.id}
              className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-seam bg-panel p-3 has-[[data-checked]]:border-amber/50 has-[[data-checked]]:bg-amber/[0.06]"
            >
              <RadioGroupItem value={record.id} className="mt-0.5" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-paper">{record.name}</span>
                <span className="block truncate text-xs text-fog">{primaryMeta(record)}</span>
              </span>
            </label>
          ))}
        </RadioGroup>
      </fieldset>

      {conflicts.map((conflict) => (
        <fieldset key={conflict.field} className="space-y-2">
          <legend className="text-sm font-medium text-paper">{conflict.label}</legend>
          <RadioGroup
            value={choices[conflict.field] ?? conflict.values[0]}
            onValueChange={(value) => onChoiceChange(conflict.field, value)}
            aria-label={conflict.label}
            className="grid-cols-1 sm:grid-cols-2"
          >
            {conflict.values.map((value) => (
              <label
                key={value}
                className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-seam bg-panel px-3 py-2 has-[[data-checked]]:border-amber/50 has-[[data-checked]]:bg-amber/[0.06]"
              >
                <RadioGroupItem value={value} />
                <span className="min-w-0 break-words text-sm text-paper">{value}</span>
              </label>
            ))}
          </RadioGroup>
        </fieldset>
      ))}

      <MergePreview records={records} />
    </div>
  );
}
