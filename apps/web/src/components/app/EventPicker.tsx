import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export interface EventOption {
  id: string;
  name: string;
}

/**
 * Attach-to-event fields for capture forms. Pick an existing event or
 * type a new name — the save action prefers the new name when both are set.
 * `defaultEventId` preselects the active event (M2: same-day captures
 * default to the event you're already in).
 */
export function EventPicker({
  events,
  defaultEventId,
}: {
  events: EventOption[];
  defaultEventId?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 rounded-xl border border-seam bg-paper/[0.02] p-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="eventId" className="mb-2 text-fog">
          Event
        </Label>
        <Select id="eventId" name="eventId" defaultValue={defaultEventId ?? ""}>
          <option value="">None</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="newEventName" className="mb-2 text-fog">
          …or start a new one
        </Label>
        <Input
          id="newEventName"
          name="newEventName"
          placeholder="Web Summit 2026"
          className="h-10"
        />
      </div>
    </div>
  );
}
