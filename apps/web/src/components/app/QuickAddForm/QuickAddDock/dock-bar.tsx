import { GlassSurface } from "@/components/ui/glass-surface";
import { Dock, type DockItemData } from "@/components/ui/dock";
import { DictationProgress } from "../../contact/DictationProgress";

/**
 * The quick-add bottom bar: the dictation-progress pill above the glass dock,
 * floating (fixed to the viewport) or in-flow. Pure presentation — split from
 * index.tsx to keep the component under the 150-line rule.
 */
export function DockBar({
  floating,
  items,
  dictationBusy,
  loadingProgress,
  transcribing,
  partialText,
}: {
  floating: boolean;
  items: DockItemData[];
  dictationBusy: boolean;
  loadingProgress: number | null;
  transcribing: boolean;
  partialText: string | null;
}) {
  return (
    <div
      className={
        floating
          ? "pointer-events-none fixed inset-x-0 bottom-6 z-30 flex flex-col items-center gap-2 px-4"
          : "flex flex-col items-center gap-2"
      }
    >
      {dictationBusy ? (
        <div className={`rounded-full border border-seam bg-panel px-3 py-1 ${floating ? "pointer-events-auto" : ""}`}>
          <DictationProgress loadingProgress={loadingProgress} transcribing={transcribing} partialText={partialText} />
        </div>
      ) : null}
      {/* backgroundOpacity is near-solid on purpose: this dock floats over
          dense list content, and at 0.35 the page text behind it refracted
          straight through the chromatic backdrop filter and collided with the
          dock's own "Voice / Camera / Upload / Capture" labels — illegible,
          worst in light mode. The glass edge treatment survives. */}
      <GlassSurface
        width="fit-content"
        height={88}
        borderRadius={28}
        backgroundOpacity={0.92}
        className={`tour-quick-add px-1 ${floating ? "pointer-events-auto" : ""}`}
      >
        <Dock items={items} />
      </GlassSurface>
    </div>
  );
}
