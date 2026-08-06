"use client";

import { useFormStatus } from "react-dom";
import { markReachedOutAction } from "@/lib/actions/reminders";
import { ActionForm } from "@/components/app/ActionForm";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { CADENCE_OPTIONS } from "@/utils/constants/app";
import { ScheduleFields } from "./ScheduleFields";
import { useSchedule } from "./use-schedule";
import type { RecurrenceRule } from "@dhaga/core";

function SmallSubmit({ label }: { label: string }): React.ReactElement {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="outline" size="sm" className="min-h-11" loading={pending}>{label}</Button>;
}

export function KeepInTouch({
  contactId,
  everyDays,
  schedule,
  initialWarning,
  lastTouch,
  due,
}: {
  contactId: string;
  everyDays: number | null;
  schedule: RecurrenceRule | null;
  initialWarning: string | null;
  lastTouch: string;
  due: boolean;
}): React.ReactElement {
  const control = useSchedule({ contactId, everyDays, schedule, initialWarning });
  return (
    <div className="space-y-3 rounded-2xl border border-seam bg-panel p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-paper">Keep in touch</p>
        <p className="text-xs text-fog">
          {everyDays
            ? due ? `Overdue — last touch ${lastTouch}.` : `On track — last touch ${lastTouch}.`
            : "No reminder set."}
        </p>
      </div>
      <Select
        value={control.value.days}
        onChange={(event) => control.save({
          days: event.target.value, weekday: "", monthDay: "", month: "",
        })}
        disabled={control.pending}
        aria-label="Reach-out cadence"
        className="h-11 text-xs"
      >
        <option value="">No reminder</option>
        {CADENCE_OPTIONS.map((option) => <option key={option.days} value={option.days}>{option.label}</option>)}
      </Select>
      <ScheduleFields value={control.value} disabled={control.pending} onChange={control.save} />
      {control.warning ? (
        <div className="space-y-2 rounded-lg border border-amber/40 bg-amber/10 px-3 py-2" role="status">
          <p className="text-xs text-ember">{control.warning}</p>
          {control.confirmation ? (
            <div className="space-y-2">
              <p className="text-xs text-fog">This change has not been saved yet.</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" className="min-h-11" loading={control.pending}
                  onClick={control.confirm}>Save anyway</Button>
                <Button type="button" size="sm" variant="ghost" className="min-h-11"
                  disabled={control.pending} onClick={control.cancel}>Cancel</Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {everyDays ? (
        <div className="flex justify-end">
          <ActionForm action={markReachedOutAction} errorMessage="Couldn't update the reminder — try again.">
            <input type="hidden" name="contactId" value={contactId} />
            <SmallSubmit label="I reached out ✓" />
          </ActionForm>
        </div>
      ) : null}
    </div>
  );
}
