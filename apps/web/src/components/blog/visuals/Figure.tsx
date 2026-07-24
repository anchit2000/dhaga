import type { ReactElement, ReactNode } from "react";

interface FigureProps {
  caption?: string;
  children: ReactNode;
  className?: string;
}

// Shared frame for every blog visual: a bordered, rounded panel that holds the
// diagram, with an optional fog-italic caption below. The other visuals compose
// this so the frame + caption treatment lives in exactly one place.
export function Figure({
  caption,
  children,
  className,
}: FigureProps): ReactElement {
  return (
    <figure className={`my-6 w-full max-w-full${className ? ` ${className}` : ""}`}>
      <div className="w-full overflow-hidden rounded-xl border border-seam bg-panel p-4 sm:p-6">
        {children}
      </div>
      {caption ? (
        <figcaption className="mt-3 text-sm italic text-fog">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
