"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Check, Globe } from "lucide-react";
import { ActionForm } from "@/components/app/ActionForm";
import { SaveButton } from "@/components/app/settings/SuggestionsToggles";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { setTimezoneAction } from "@/lib/actions/suggestions";
import { supportedTimeZones } from "@/lib/time/zone";
import {
  humaniseZone,
  readBrowserZone,
  readNoZone,
  subscribeNever,
  toZoneOption,
  type ZoneOption,
} from "./zone-options";

/**
 * Base UI's combobox does NOT virtualise (its `virtualized` prop only tells it
 * that *you* are virtualising elsewhere), so all ~418 zones would mount as DOM
 * nodes on open. Its own `limit` prop is the cheap fix: at most this many rows
 * render at a time, and typing narrows the set — no virtualiser dependency for
 * one settings field.
 */
const VISIBLE_ZONES = 60;

// The same field-label class the sibling suggestions/important-dates cards each
// define locally, kept module-local here for the same reason they give: one
// Tailwind string isn't a shared constant.
const fieldLabel = "block text-xs text-fog";

/**
 * The user's IANA timezone. One value, set once, that decides when a day starts
 * and ends for reminder emails — which is why it is worth a card of its own
 * rather than a fifth cell in the daily-suggestions grid.
 */
export function TimezoneSetting({ timezone }: { timezone: string }): React.ReactElement {
  const options = useMemo(() => supportedTimeZones().map(toZoneOption), []);
  const [selected, setSelected] = useState(timezone);
  // Detection only ever *offers* a zone — it is rendered as a button, never
  // written into `selected`, so a user who picked Asia/Kolkata while travelling
  // keeps it. Read through useSyncExternalStore rather than during render because
  // the server's zone is not the browser's: the server snapshot is `null`, so the
  // suggestion appears only after hydration and can't mismatch.
  const detected = useSyncExternalStore(subscribeNever, readBrowserZone, readNoZone);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === selected) ?? toZoneOption(selected),
    [options, selected],
  );
  const showDetected = detected !== null && detected !== selected;

  return (
    <section className="space-y-5 rounded-2xl border border-seam bg-panel p-5 sm:p-6">
      <div>
        <h2 className="font-display text-lg">Time zone</h2>
        <p className="mt-1 text-sm text-fog">
          Which zone your days are measured in. Reminder emails use it to decide when a day starts
          and ends, so a birthday lands on your morning and not the server&apos;s.
        </p>
      </div>

      <ActionForm
        action={setTimezoneAction}
        errorMessage="Couldn't save your time zone — try again."
        className="space-y-4"
      >
        <input type="hidden" name="timezone" value={selected} />
        <div className="max-w-sm">
          <label className={fieldLabel}>
            Time zone
            <Combobox<ZoneOption>
              items={options}
              limit={VISIBLE_ZONES}
              value={selectedOption}
              isItemEqualToValue={(item, value) => item.value === value.value}
              onValueChange={(option) => {
                if (option) setSelected(option.value);
              }}
            >
              <ComboboxInput
                className="mt-1"
                placeholder="Search cities and regions"
                aria-label="Time zone"
              />
              <ComboboxContent>
                <ComboboxList>
                  {(option: ZoneOption) => (
                    <ComboboxItem key={option.value} value={option}>
                      <Check
                        aria-hidden
                        className={`size-4 shrink-0 text-ember ${
                          option.value === selected ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      <span className="min-w-0 truncate">{option.label}</span>
                    </ComboboxItem>
                  )}
                </ComboboxList>
                <ComboboxEmpty>No zone matches that.</ComboboxEmpty>
              </ComboboxContent>
            </Combobox>
          </label>
          {/* Said out loud because the list really is truncated: without this,
              scrolling to the end of the Africa/* zones looks like the whole set. */}
          <p className="mt-1.5 text-xs text-fog">
            Type a city or region — the list shows the first {VISIBLE_ZONES} matches.
          </p>
        </div>

        {showDetected ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-11 text-ember"
            onClick={() => setSelected(detected)}
          >
            <Globe aria-hidden />
            Use detected zone ({humaniseZone(detected)})
          </Button>
        ) : null}

        <div>
          <SaveButton />
        </div>
      </ActionForm>
    </section>
  );
}
