import type { ReactElement } from "react";
import { Search } from "lucide-react";

/** The nav pill that opens the palette (⌘K opens it too, via useSearchPalette). */
export function SearchTrigger({ onOpen }: { onOpen: () => void }): ReactElement {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Search your network"
      className="flex h-9 w-9 items-center justify-center rounded-full border border-seam bg-panel-2/60 text-fog transition-colors hover:border-wash/30 hover:text-paper sm:w-full sm:max-w-2xl sm:justify-start sm:gap-2 sm:rounded-full sm:px-3"
    >
      <Search className="size-4 shrink-0" />
      <span className="hidden flex-1 text-left text-sm sm:inline">
        Search your network…
      </span>
      <kbd className="hidden shrink-0 rounded border border-seam bg-well px-1.5 py-0.5 font-mono text-[10px] text-fog sm:inline">
        ⌘K
      </kbd>
    </button>
  );
}
