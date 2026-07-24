"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SETTINGS_HASH_TO_TAB,
  SETTINGS_TABS,
  type SettingsTab,
} from "@/utils/constants/settings";

function isSettingsTab(value: string): value is SettingsTab {
  return SETTINGS_TABS.some((tab) => tab.value === value);
}

/**
 * Client tab shell for /app/settings. Each server section is passed in as a
 * pre-rendered slot, so the per-section <Suspense> boundaries inside them keep
 * streaming independently — `keepMounted` renders every panel (inactive ones
 * just get `hidden`), so a slow card never blocks the others and nothing is
 * re-fetched on tab switch.
 *
 * Active tab syncs to the URL hash. Deep links resolve on mount / hashchange
 * (`#import`, `#voice-dictation`, …), and the `?calendar=` OAuth return always
 * opens the Calendar tab.
 */
export function SettingsTabs({
  calendarActive,
  account,
  capture,
  calendar,
  suggestions,
  importPanel,
}: {
  calendarActive: boolean;
  account: ReactNode;
  capture: ReactNode;
  calendar: ReactNode;
  suggestions: ReactNode;
  importPanel: ReactNode;
}) {
  const [value, setValue] = useState<SettingsTab>(calendarActive ? "calendar" : "account");

  // Hash-based deep links (client-only; the hash never reaches the server, so
  // this can't run at render without a hydration mismatch). The ?calendar=
  // OAuth return wins and carries no hash, so it stays selected.
  useEffect(() => {
    if (calendarActive) return;
    function applyHash(): void {
      const mapped = SETTINGS_HASH_TO_TAB[window.location.hash.slice(1)];
      if (mapped) setValue(mapped);
    }
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [calendarActive]);

  function handleChange(next: SettingsTab): void {
    setValue(next);
    // replaceState keeps path + query (e.g. ?calendar=) and only swaps the
    // hash, without a scroll jump or a new history entry.
    window.history.replaceState(null, "", `#${next}`);
  }

  const panels: Record<SettingsTab, ReactNode> = {
    account,
    capture,
    calendar,
    suggestions,
    import: importPanel,
  };

  return (
    <Tabs
      value={value}
      onValueChange={(next: unknown) => {
        if (typeof next === "string" && isSettingsTab(next)) handleChange(next);
      }}
    >
      <TabsList
        variant="line"
        className="group-data-horizontal/tabs:h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-seam"
      >
        {SETTINGS_TABS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="min-h-11 flex-none rounded-none px-3 text-fog data-active:text-paper data-active:after:bg-amber"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {SETTINGS_TABS.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} keepMounted className="mt-6 space-y-6">
          {panels[tab.value]}
        </TabsContent>
      ))}
    </Tabs>
  );
}
