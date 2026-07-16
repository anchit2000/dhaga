/** Branded progress shell shown while the graph fetches and lays out. */
export function LoadingState({
  label,
  progress,
}: {
  label: string;
  /** 0..1 when known; null renders an indeterminate shimmer. */
  progress: number | null;
}): React.ReactElement {
  return (
    <div className="flex h-[70vh] min-h-[420px] flex-col items-center justify-center gap-4 rounded-2xl border border-seam bg-ink">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber">{label}</p>
      <div className="h-1 w-56 overflow-hidden rounded-full bg-seam">
        {progress === null ? (
          <div className="h-full w-1/3 animate-pulse rounded-full bg-amber/70" />
        ) : (
          <div
            className="h-full rounded-full bg-amber transition-[width] duration-200"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        )}
      </div>
      <p className="text-xs text-fog">Everything stays on this device until you act on it.</p>
    </div>
  );
}
