import type { ReactElement, ReactNode } from "react";

interface BlogPageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}

// Shared masthead for the blog hub and category landings: a mono eyebrow, a
// display-face title over the warm amber thread glow, and the hand-authored
// description. `children` slots in optional actions (e.g. a back link).
export function BlogPageHeader({
  eyebrow,
  title,
  description,
  children,
}: BlogPageHeaderProps): ReactElement {
  return (
    <header className="relative overflow-hidden border-b border-seam pb-10">
      {/* Amber thread glow — decorative, sits behind the copy. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[36rem] max-w-full -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in oklab, var(--color-amber) 22%, transparent), transparent)",
        }}
      />
      <div className="relative">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-fog">
          {eyebrow}
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-3xl leading-tight text-paper sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-fog">
          {description}
        </p>
        {children ? <div className="mt-6">{children}</div> : null}
      </div>
    </header>
  );
}
