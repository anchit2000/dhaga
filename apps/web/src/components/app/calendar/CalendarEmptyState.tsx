"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/EmptyState";

/** Shown only when the board has nothing at all to draw — no follow-ups AND no
 *  events from a connected calendar. */
export function CalendarEmptyState() {
  return (
    <EmptyState
      title="Nothing on the calendar"
      body="Follow-ups with a due date land here — capture a contact and add one to get started."
    >
      <Button render={<Link href="/app/quick-add" />}>Quick add a contact</Button>
    </EmptyState>
  );
}
