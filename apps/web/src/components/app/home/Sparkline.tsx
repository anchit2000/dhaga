/**
 * Minimal dependency-free sparkline — an inline SVG polyline of `data`, stretched
 * to fill its box (a non-scaling stroke keeps the line crisp under the stretch).
 * Used under each StatStrip tile to show that metric's recent weekly activity;
 * colour comes from the parent's `currentColor` (a `text-*` class).
 */
export function Sparkline({
  data,
  className,
}: {
  data: number[];
  className?: string;
}): React.ReactElement | null {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const stepX = 100 / (data.length - 1);
  const points = data
    .map((value, index) => `${(index * stepX).toFixed(1)},${(100 - (value / max) * 100).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden className={className}>
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
