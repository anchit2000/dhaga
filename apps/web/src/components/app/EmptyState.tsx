export function EmptyState({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-seam bg-panel/40 px-6 py-12 text-center">
      <p className="font-display text-lg text-paper">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-fog">{body}</p>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}
