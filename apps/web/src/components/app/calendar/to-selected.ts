import type { CalendarFollowUp } from "@/lib/repo/reminders";
import type { FollowUpEventProps } from "./event-map";
import type { SelectedFollowUp } from "./EventDetailsDialog";

/**
 * The details dialog opens from two places that hold the same follow-up in two
 * shapes: a grid event (data read back off FullCalendar's extendedProps) and an
 * Unscheduled tray chip (the row itself). Both funnel through here so the dialog
 * cannot drift into rendering one of them differently — the tray chip's whole
 * point is showing the action text the chip truncates.
 */
export function selectedFromEvent(id: string, props: FollowUpEventProps): SelectedFollowUp {
  return {
    id,
    contactId: props.contactId,
    contactName: props.contactName,
    companyId: props.companyId,
    companyName: props.companyName,
    associationLabel: props.associationLabel,
    action: props.action,
    dueDate: props.dueDate,
    status: props.status,
  };
}

/** A tray chip: same fields, and `dueDate` is null by construction (that is what
 *  put it in the tray). The dialog labels that "Unscheduled". */
export function selectedFromFollowUp(item: CalendarFollowUp): SelectedFollowUp {
  return {
    id: item.id,
    contactId: item.contactId,
    contactName: item.contactName,
    companyId: item.companyId,
    companyName: item.companyName,
    associationLabel: item.associationLabel,
    action: item.action,
    dueDate: item.dueDate,
    status: item.status,
  };
}
