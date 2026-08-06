import type { ReactElement } from "react";
import Image from "next/image";

/** The comic scene shared by not-found surfaces. The speech stays real HTML
 * so it remains selectable, translatable, and visible to assistive tech. */
export function SearchingShopkeeper(): ReactElement {
  return (
    <figure className="dhaga-search-scene relative overflow-hidden rounded-2xl border border-seam bg-panel shadow-[0_24px_60px_-36px_var(--shadow-cast)]">
      <Image
        src="/illustrations/shopkeeper-searching.webp"
        alt="A saree shopkeeper searching between shelves of folded fabrics"
        width={1200}
        height={800}
        sizes="(max-width: 768px) 92vw, 768px"
        preload
        unoptimized
        className="h-auto w-full"
      />
      <h1 className="absolute left-[43%] top-[12%] flex h-[39%] w-[52%] items-center justify-center px-3 text-center font-display text-[clamp(0.65rem,2.6vw,1.2rem)] leading-snug text-on-accent sm:px-8">
        Sorry, I can’t find it yet. Maybe it’s still being woven?
      </h1>
    </figure>
  );
}
