import type { ClassNames } from "react-day-picker";

/**
 * Amber/seam/panel theme for react-day-picker, applied via `classNames` only —
 * no global `style.css` import — so the primitive stays self-contained and
 * matches the token approach in `combobox.tsx`. Day cells are 44px (touch
 * target); the selected day paints its `day_button` child amber.
 */
export const CALENDAR_CLASS_NAMES: Partial<ClassNames> = {
  root: "text-paper",
  months: "relative",
  month: "space-y-2",
  month_caption: "flex h-11 items-center justify-center px-11",
  // `inline-flex`/`nowrap`/`z-[1]` mirror react-day-picker's own stylesheet: in
  // dropdown mode this span is the VISIBLE twin of each <select> (which sits at
  // `z-[2]` on top of it) and holds the label plus its chevron. Visually inert for
  // the label caption the other call sites render — one centred text node.
  caption_label:
    "relative z-[1] inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium text-paper",
  nav: "absolute inset-x-0 top-0 flex h-11 items-center justify-between",
  button_previous:
    "inline-flex size-9 items-center justify-center rounded-lg text-fog outline-none hover:bg-wash/[0.08] hover:text-paper focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
  button_next:
    "inline-flex size-9 items-center justify-center rounded-lg text-fog outline-none hover:bg-wash/[0.08] hover:text-paper focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
  chevron: "size-4 fill-current",
  month_grid: "w-full border-collapse",
  weekdays: "flex",
  weekday: "flex size-11 items-center justify-center text-xs font-normal text-fog",
  week: "flex",
  day: "p-0 text-center",
  day_button:
    "inline-flex size-11 items-center justify-center rounded-lg text-sm text-paper outline-none hover:bg-wash/[0.08] focus-visible:ring-2 focus-visible:ring-ring/50",
  today: "[&>button]:font-semibold [&>button]:text-ember",
  selected:
    "[&>button]:bg-amber [&>button]:font-semibold [&>button]:text-on-accent [&>button]:hover:bg-amber",
  outside: "[&>button]:text-fog",
  disabled: "[&>button]:pointer-events-none [&>button]:opacity-50",
  hidden: "invisible",
  // Dropdown caption only (`captionLayout="dropdown*"`), so the label caption the
  // other call sites use is untouched: react-day-picker renders a real <select>
  // plus a visible `caption_label` twin and leans on its own stylesheet — which we
  // don't import — to hide the select over that twin. Painting the select
  // transparent across the pill does that job; `scheme-*` is what keeps the native
  // option list dark in dark mode, since nothing sets `color-scheme` globally.
  dropdowns: "flex items-center justify-center gap-2",
  dropdown_root:
    "relative inline-flex h-11 max-w-full items-center gap-1 rounded-lg border border-line px-3 hover:bg-wash/[0.08] has-focus-visible:ring-2 has-focus-visible:ring-ring/50",
  dropdown:
    "absolute inset-0 z-[2] cursor-pointer appearance-none bg-transparent opacity-0 scheme-light dark:scheme-dark",
};
