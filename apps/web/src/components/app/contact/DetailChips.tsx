export function DetailChips({
  label,
  values,
}: {
  label: string;
  values: string[];
}) {
  if (values.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-fog/70">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {values.map((value) => (
          <span
            key={value}
            className="max-w-full truncate rounded-full border border-seam bg-wash/[0.04] px-2.5 py-1 text-xs text-paper"
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}
