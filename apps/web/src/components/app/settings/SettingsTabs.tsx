"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
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
  billingActive,
  account,
  billing,
  credits,
  capture,
  calendar,
  messaging,
  suggestions,
  importPanel,
}: {
  calendarActive: boolean;
  /** False on a core-only self-host, where BillingSection renders nothing —
   *  an always-empty tab would be worse than no tab, so drop it entirely. */
  billingActive: boolean;
  account: ReactNode;
  billing: ReactNode;
  credits: ReactNode;
  capture: ReactNode;
  calendar: ReactNode;
  messaging: ReactNode;
  suggestions: ReactNode;
  importPanel: ReactNode;
}) {
  const tabs = SETTINGS_TABS.filter((tab) => tab.value !== "billing" || billingActive);
  const [value, setValue] = useState<SettingsTab>(calendarActive ? "calendar" : "account");

  // Hash-based deep links (client-only; the hash never reaches the server, so
  // this can't run at render without a hydration mismatch). The ?calendar=
  // OAuth return wins and carries no hash, so it stays selected.
  useEffect(() => {
    if (calendarActive) return;
    function applyHash(): void {
      const mapped = SETTINGS_HASH_TO_TAB[window.location.hash.slice(1)];
      // #billing on an instance without billing maps to a tab that isn't
      // rendered — selecting it would hide every panel, so ignore it.
      if (mapped && (mapped !== "billing" || billingActive)) setValue(mapped);
    }
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [calendarActive, billingActive]);

  // The trigger row scrolls horizontally on narrow screens, and the later tabs
  // (Messaging, Suggestions, Import) sit off its right edge. Landing on one via
  // #hash left the row showing only the first few tabs with no active marker
  // anywhere — the page read as "nothing is selected". Pull the active trigger
  // into view instead.
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active], [data-state="active"]')
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [value]);

  function handleChange(next: SettingsTab): void {
    setValue(next);
    // replaceState keeps path + query (e.g. ?calendar=) and only swaps the
    // hash, without a scroll jump or a new history entry.
    window.history.replaceState(null, "", `#${next}`);
  }

  const panels: Record<SettingsTab, ReactNode> = {
    account,
    billing,
    credits,
    capture,
    calendar,
    messaging,
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
        ref={listRef}
        variant="line"
        className="group-data-horizontal/tabs:h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-seam pb-1.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="min-h-11 flex-none rounded-none px-3 text-fog data-active:text-paper data-active:after:bg-amber"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} keepMounted className="mt-6 space-y-6">
          {panels[tab.value]}
        </TabsContent>
      ))}
    </Tabs>
  );
}
