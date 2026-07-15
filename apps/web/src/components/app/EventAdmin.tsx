"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { mergeEventAction, renameEventAction, updateEventMetaAction } from "@/lib/actions/events";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EventStyleFields } from "./EventStyleFields";
import { EventTagInput } from "./EventTagInput";

function ChipSubmit({ label, confirmText }: { label: string; confirmText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-seam px-3 py-1.5 text-xs text-fog transition-colors hover:text-paper disabled:pointer-events-none"
      onClick={(event) => {
        if (confirmText && !confirm(confirmText)) event.preventDefault();
      }}
    >
      {pending ? <Loader2 className="size-3 animate-spin" /> : null}
      {label}
    </button>
  );
}

/** Rename this event, edit its appearance and tags, or merge it into another one. */
export function EventAdmin({
  eventId,
  name,
  emoji,
  color,
  tags,
  otherEvents,
}: {
  eventId: string;
  name: string;
  emoji: string | null;
  color: string | null;
  tags: string[];
  otherEvents: { id: string; name: string }[];
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-seam bg-panel p-4">
      <div className="flex flex-wrap gap-3">
        <form action={renameEventAction} className="flex min-w-0 flex-1 items-center gap-2">
          <input type="hidden" name="eventId" value={eventId} />
          <Input
            name="name"
            defaultValue={name}
            required
            aria-label="Event name"
            className="h-8 max-w-60 text-sm"
          />
          <ChipSubmit label="Rename" />
        </form>
        {otherEvents.length > 0 ? (
          <form action={mergeEventAction} className="flex items-center gap-2">
            <input type="hidden" name="fromId" value={eventId} />
            <Select
              name="intoId"
              required
              defaultValue=""
              aria-label="Merge into event"
              className="h-8 w-44 text-xs"
            >
              <option value="" disabled>
                Merge into…
              </option>
              {otherEvents.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </Select>
            <ChipSubmit
              label="Merge"
              confirmText={`Merge "${name}" into the selected event? Everyone moves over and "${name}" is deleted.`}
            />
          </form>
        ) : null}
      </div>

      <form action={updateEventMetaAction} className="space-y-3 border-t border-seam pt-4">
        <input type="hidden" name="eventId" value={eventId} />
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-fog/60">Colour &amp; emoji</p>
          <EventStyleFields defaultEmoji={emoji} defaultColor={color} />
        </div>
        <div>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-fog/60">Tags</p>
          <EventTagInput defaultTags={tags} />
        </div>
        <ChipSubmit label="Save appearance" />
      </form>
    </div>
  );
}
