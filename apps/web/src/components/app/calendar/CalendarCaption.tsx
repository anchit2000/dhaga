"use client";

import type { ReactElement } from "react";

/**
 * The legend under the grid. Two of the three kinds of entry are read-only and
 * the grid signals that with colour alone, so we also say it in words. Renders
 * nothing when follow-ups are the only thing on the board — there is no
 * distinction to explain then.
 */
export function CalendarCaption({
  hasExternal,
  hasImportantDates,
}: {
  hasExternal: boolean;
  hasImportantDates: boolean;
}): ReactElement | null {
  if (!hasExternal && !hasImportantDates) return null;
  return (
    <p className="text-xs leading-relaxed text-fog">
      {hasExternal
        ? "Muted entries come from your connected calendar and are read-only. "
        : null}
      {hasImportantDates
        ? "Birthdays and anniversaries come from your contacts — open the contact to change one. "
        : null}
      Everything else is a Dhaga follow-up.
    </p>
  );
}
