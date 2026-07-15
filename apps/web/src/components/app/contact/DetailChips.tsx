import type { ContactMethod } from "@dhaga/core";

/** Chips accept plain strings (tags, location) or labeled methods (a work/home
 *  email or phone) — the label rides along as a muted suffix on the chip. */
type ChipValue = string | ContactMethod;

export function DetailChips({
  label,
  values,
}: {
  label: string;
  values: ChipValue[];
}) {
  const chips = values
    .map((value) =>
      typeof value === "string"
        ? { value, tag: null as string | null }
        : { value: value.value, tag: value.label },
    )
    .filter((chip) => chip.value.trim().length > 0);
  if (chips.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-fog/70">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip, index) => (
          <span
            key={`${chip.value}-${index}`}
            className="max-w-full truncate rounded-full border border-seam bg-wash/[0.04] px-2.5 py-1 text-xs text-paper"
          >
            {chip.value}
            {chip.tag ? (
              <span className="ml-1.5 text-fog/60">{chip.tag}</span>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}
