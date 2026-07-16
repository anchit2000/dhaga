export function PathChip({
  label,
  kind,
}: {
  label: string;
  kind: "you" | "contact" | "company";
}): React.ReactElement {
  return (
    <span
      className={
        kind === "company"
          ? "rounded-md border border-seam bg-wash/[0.05] px-2 py-0.5 text-xs text-paper/90"
          : kind === "you"
            ? "rounded-full bg-amber/20 px-2 py-0.5 text-xs font-medium text-amber"
            : "rounded-full border border-amber/30 bg-amber/10 px-2 py-0.5 text-xs text-amber"
      }
    >
      {label}
    </span>
  );
}
