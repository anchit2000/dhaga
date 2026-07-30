/**
 * The typed shapes we stash on every calendar event so eventContent, eventClick
 * and the details dialog can read an event's data back off FullCalendar's
 * (loosely-typed) extendedProps bag without reaching for `any`.
 *
 * `kind` is the SINGLE discriminator across all three variants — the same key
 * `CalendarFollowUp` carries in @/lib/repo/reminders — so there is one mechanism
 * to learn rather than one per variant.
 */

/** A Dhaga follow-up: the only kind on the grid that has a row to mutate. */
export type FollowUpEventProps = {
  kind: "follow-up";
  contactId: string;
  contactName: string;
  action: string;
  dueHint: string | null;
  overdue: boolean;
};

/** An event read from a CONNECTED calendar — context, not Dhaga's own record. */
export type ExternalEventProps = {
  kind: "external";
  provider: string;
  accountEmail: string | null;
  location: string | null;
};

/**
 * A birthday/anniversary occurrence DERIVED from `contacts.important_dates`.
 * There is no reminder row behind it, and `contactId` identifies a CONTACT — it
 * is not a follow-up id and must never be passed anywhere that expects one.
 */
export type ImportantDateEventProps = {
  kind: "important-date";
  contactId: string;
  contactName: string;
  /** "Birthday", "Anniversary", … verbatim from the contact's entry. */
  label: string;
  /** Age / anniversary count, or null when the stored value carried no year. */
  turning: number | null;
};

/** Everything the grid can hold. */
export type CalendarEventProps = FollowUpEventProps | ExternalEventProps | ImportantDateEventProps;

/**
 * POSITIVE narrowing for the only mutable kind. Every handler that WRITES —
 * reschedule, mark done, dismiss — gates on this rather than excluding the kinds
 * it happens to know about, so a fourth kind added later is read-only by default
 * instead of falling through into a follow-up write carrying someone else's id.
 */
export function isFollowUpEventProps(props: CalendarEventProps): props is FollowUpEventProps {
  return props.kind === "follow-up";
}

/** Connected-calendar events are read-only: Dhaga owns no record to act on. */
export function isExternalEventProps(props: CalendarEventProps): props is ExternalEventProps {
  return props.kind === "external";
}

/** Derived important dates are read-only too; clicking one opens the contact. */
export function isImportantDateEventProps(
  props: CalendarEventProps,
): props is ImportantDateEventProps {
  return props.kind === "important-date";
}

/**
 * The quiet second line on an important-date chip. Phrasing follows the label
 * because "Turns 34" is only right for a birthday; null means the stored value
 * carried no year, and we say nothing rather than invent an age.
 */
export function importantDateNote(props: ImportantDateEventProps): string | null {
  if (props.turning === null) return null;
  return props.label.toLowerCase().includes("birthday")
    ? `Turns ${props.turning}`
    : `${props.turning} years`;
}
